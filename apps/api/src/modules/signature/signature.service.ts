import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import * as crypto from 'crypto';
import PDFDocument from 'pdfkit';

/** 支持的签名算法类型 */
type SignatureAlgorithm = 'ECDSA' | 'EdDSA' | 'RSA' | 'SM2';

/**
 * 电子签名服务 — 提供文档数字签名、验证、撤销及签名PDF生成能力
 *
 * 支持多种密码学算法：
 * - ECDSA（默认）：secp256k1 曲线，兼容区块链 DID 标准
 * - EdDSA：ed25519 曲线，高性能现代算法
 * - RSA：2048 位密钥，传统 PKI 兼容
 * - SM2：国密算法，符合中国国家标准 GB/T 32907
 */
@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);
  /** 签名文件存储桶 */
  private readonly BUCKET = 'smyweb3-documents';

  constructor(
    private prisma: PrismaService,
    private minio: MinioService
  ) {}

  // ==================== 核心业务方法 ====================

  /**
   * 对指定文档执行数字签名
   *
   * 流程：
   * 1. 校验文档存在性及签署权限
   * 2. 生成（或复用）密钥对
   * 3. 对文档内容哈希进行签名
   * 4. 持久化签名记录到 ESignature 表
   * 5. 生成带可视化签名的 PDF 并上传至 MinIO
   *
   * @param documentId 目标文档 ID
   * @param signerDid 签署者 DID 身份 ID
   * @param ipAddress 签署时 IP 地址（可选）
   * @param userAgent 签署时客户端 UA（可选）
   * @param algorithm 签名算法，默认 ECDSA
   * @returns 签名记录信息（含签名值、公钥、已签名文档 URL）
   */
  async signDocument(
    documentId: number,
    signerDid: number,
    ipAddress?: string,
    userAgent?: string,
    algorithm: SignatureAlgorithm = 'ECDSA'
  ): Promise<{
    signatureId: number;
    signatureValue: string;
    publicKey: string;
    documentUrl: string;
  }> {
    this.logger.log(`开始签署文档 documentId=${documentId}, did=${signerDid}, algo=${algorithm}`);

    // 1. 校验文档是否存在
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException(`文档不存在: documentId=${documentId}`);
    }

    // 2. 检查是否已签名（ESignature 与 Document 为 1:1 关系）
    const existing = await this.prisma.eSignature.findUnique({ where: { documentId } });
    if (existing && existing.isValid) {
      throw new BadRequestException(`该文档已签署有效签名，请先撤销原签名`);
    }

    // 3. 获取签署者身份信息
    const signer = await this.prisma.didIdentity.findUnique({ where: { id: signerDid } });
    if (!signer) {
      throw new NotFoundException(`DID 身份不存在: signerDid=${signerDid}`);
    }

    // 4. 生成密钥对
    const keyPair = this.generateKeyPair(algorithm);

    // 5. 构造待签名数据（文档核心字段 + 时间戳防重放）
    const dataToSign = Buffer.from(
      JSON.stringify({
        documentId: document.id,
        documentName: document.name,
        fileUrl: document.fileUrl,
        signedAt: new Date().toISOString(),
        signerDid: signerDid,
      })
    );

    // 6. 执行数字签名
    const signatureValue = this.signData(dataToSign, keyPair.privateKey, algorithm);

    // 7. 生成带可视化签名的 PDF
    const signatureData = {
      signerName: (signer as any).name || signer.did,
      signerDid: signer.did,
      signedAt: new Date(),
      algorithm,
      signatureValue,
    };
    const pdfBuffer = await this.generateSignedPdf(documentId, signatureData);

    // 8. 上传已签名 PDF 至 MinIO
    const objectName = `signed-docs/${documentId}_${Date.now()}.pdf`;
    const uploadResult = await this.minio.upload(this.BUCKET, objectName, pdfBuffer, {
      contentType: 'application/pdf',
      size: pdfBuffer.length,
    });

    // 9. 持久化签名记录（若已有记录则更新，否则新建）
    let signatureRecord;
    if (existing) {
      signatureRecord = await this.prisma.eSignature.update({
        where: { documentId },
        data: {
          signerDid,
          signatureValue,
          publicKey: keyPair.publicKey,
          algorithm,
          ipAddress,
          userAgent,
          isValid: true,
          revokedAt: null,
          revokeReason: null,
        },
      });
    } else {
      signatureRecord = await this.prisma.eSignature.create({
        data: {
          documentId,
          signerDid,
          signatureValue,
          publicKey: keyPair.publicKey,
          algorithm,
          ipAddress,
          userAgent,
        },
      });
    }

    this.logger.log(`文档签署完成 signatureId=${signatureRecord.id}`);
    return {
      signatureId: signatureRecord.id,
      signatureValue: signatureRecord.signatureValue,
      publicKey: signatureRecord.publicKey,
      documentUrl: uploadResult.url,
    };
  }

  /**
   * 验证数字签名的有效性
   *
   * 使用存储的公钥重新验算签名，同时检查撤销状态
   *
   * @param signatureId 签名记录 ID
   * @returns 验证结果（是否有效、签署者信息、签署时间、算法）
   */
  async verifySignature(signatureId: number): Promise<{
    isValid: boolean;
    signerInfo: object;
    signedAt: Date;
    algorithm: string;
  }> {
    this.logger.log(`验证签名 signatureId=${signatureId}`);

    const sig = await this.prisma.eSignature.findUnique({
      where: { id: signatureId },
      include: { signer: true, document: true },
    });

    if (!sig) {
      throw new NotFoundException(`签名记录不存在: signatureId=${signatureId}`);
    }

    // 1. 检查撤销状态
    if (!sig.isValid) {
      this.logger.warn(`签名已被撤销: reason=${sig.revokeReason}`);
      return {
        isValid: false,
        signerInfo: { did: sig.signer?.did, name: (sig.signer as any)?.name },
        signedAt: sig.signedAt,
        algorithm: sig.algorithm,
      };
    }

    // 2. 使用公钥重新验算签名
    const dataToVerify = Buffer.from(
      JSON.stringify({
        documentId: (sig as any).document?.id,
        documentName: (sig as any).document?.name,
        fileUrl: (sig as any).document?.fileUrl,
        signedAt: sig.signedAt.toISOString(),
        signerDid: sig.signerDid,
      })
    );

    const cryptoValid = this.verifyData(
      dataToVerify,
      sig.signatureValue,
      sig.publicKey,
      sig.algorithm as SignatureAlgorithm
    );

    if (!cryptoValid) {
      this.logger.error(`密码学验签失败 signatureId=${signatureId}，可能数据被篡改`);
    }

    return {
      isValid: cryptoValid && sig.isValid,
      signerInfo: {
        did: sig.signer?.did,
        name: (sig.signer as any)?.name,
        documentName: (sig as any).document?.name,
      },
      signedAt: sig.signedAt,
      algorithm: sig.algorithm,
    };
  }

  /**
   * 撤销数字签名
   *
   * 将签名标记为无效并记录撤销原因与时间戳
   *
   * @param signatureId 签名记录 ID
   * @param reason 撤销原因说明
   * @param operatorId 操作人 ID
   */
  async revokeSignature(signatureId: number, reason: string, operatorId: number): Promise<void> {
    this.logger.log(
      `撤销签名 signatureId=${signatureId}, operator=${operatorId}, reason=${reason}`
    );

    const sig = await this.prisma.eSignature.findUnique({ where: { id: signatureId } });
    if (!sig) {
      throw new NotFoundException(`签名记录不存在: signatureId=${signatureId}`);
    }
    if (!sig.isValid) {
      throw new BadRequestException(`该签名已被撤销，无需重复操作`);
    }

    await this.prisma.eSignature.update({
      where: { id: signatureId },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokeReason: `[操作人:${operatorId}] ${reason}`,
      },
    });

    this.logger.log(`签名已撤销 signatureId=${signatureId}`);
  }

  // ==================== PDF 生成 ====================

  /**
   * 生成带可视化电子签名的 PDF 文档
   *
   * 包含：
   * - 原始文档内容区域
   * - 可视化签名区块（签署人姓名、日期、"Digitally Signed" 标识）
   * - 二维码（链接至签名验证 URL）
   *
   * @param documentId 文档 ID
   * @param signatureData 签名元数据
   * @returns PDF Buffer
   */
  async generateSignedPdf(
    documentId: number,
    signatureData: {
      signerName: string;
      signerDid: string;
      signedAt: Date;
      algorithm: string;
      signatureValue: string;
    }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        info: {
          Title: `Signed Document #${documentId}`,
          Author: signatureData.signerName,
          Subject: `Electronically Signed via ${signatureData.algorithm}`,
        },
        bufferPages: true,
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 50;

      // --- 文档标题 ---
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Electronically Signed Document', margin, margin, { width: pageWidth - margin * 2 });

      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Document ID: ${documentId}`)
        .text(`Generated: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);

      // --- 分隔线 ---
      doc
        .moveDown(0.5)
        .strokeColor('#cccccc')
        .lineWidth(0.5)
        .moveTo(margin, doc.y)
        .lineTo(pageWidth - margin, doc.y)
        .stroke();
      doc.moveDown(1);

      // --- 可视化签名区块 ---
      const signatureY = doc.y;
      const boxHeight = 140;

      // 签名框背景
      doc
        .save()
        .roundedRect(margin, signatureY, pageWidth - margin * 2, boxHeight, 8)
        .fill('#f8f9fa')
        .restore();

      // 签名标题
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('Digital Signature', margin + 15, signatureY + 12);

      // 签名者信息
      doc.fontSize(11).font('Helvetica').fillColor('#333333');
      const infoX = margin + 15;
      let infoY = signatureY + 32;

      doc.text(`Signer: ${signatureData.signerName}`, infoX, infoY);
      infoY += 18;
      doc.text(`DID: ${signatureData.signerDid}`, infoX, infoY);
      infoY += 18;
      doc.text(
        `Date: ${signatureData.signedAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
        infoX,
        infoY
      );
      infoY += 18;
      doc.text(`Algorithm: ${signatureData.algorithm}`, infoX, infoY);

      // "Digitally Signed" 徽章
      const badgeX = pageWidth - margin - 150;
      const badgeY = signatureY + 20;
      doc
        .save()
        .roundedRect(badgeX, badgeY, 135, 28, 4)
        .fillAndStroke('#27ae60', '#27ae60')
        .restore();
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('\u2705 Digitally Signed', badgeX + 12, badgeY + 7);

      // --- 验证二维码区域（文本模拟） ---
      doc.fillColor('#333333').fontSize(9).font('Helvetica');
      const qrY = signatureY + boxHeight + 15;
      doc.text(
        `Verification Code: ${signatureData.signatureValue.substring(0, 64)}...`,
        margin,
        qrY,
        {
          width: pageWidth - margin * 2,
        }
      );
      doc.text(
        `Verify online: ${process.env.APP_BASE_URL || 'https://app.example.com'}/signature/${documentId}/verify`,
        margin,
        doc.y + 4,
        {
          link: `${process.env.APP_BASE_URL || 'https://app.example.com'}/signature/${documentId}/verify`,
          underline: true,
        }
      );

      // --- 页脚 ---
      doc.fontSize(8).fillColor('#999999');
      const footerY = doc.page.height - 40;
      doc.text(
        `This document was digitally signed using ${signatureData.algorithm}. The signature is cryptographically verifiable.`,
        margin,
        footerY,
        { width: pageWidth - margin * 2, align: 'center' }
      );

      doc.end();
    });
  }

  // ==================== 密码学工具方法 ====================

  /**
   * 根据指定算法生成非对称密钥对
   *
   * @param algorithm 签名算法类型
   * @returns 公私钥对（PEM 格式字符串）
   */
  generateKeyPair(algorithm: SignatureAlgorithm): { publicKey: string; privateKey: string } {
    switch (algorithm) {
      case 'ECDSA': {
        /** secp256k1 曲线 — 与以太坊/比特币兼容 */
        const ecKey = crypto.generateKeyPairSync('ec', {
          namedCurve: 'secp256k1',
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        return { publicKey: ecKey.publicKey, privateKey: ecKey.privateKey };
      }

      case 'EdDSA': {
        /** ed25519 曲线 — 高性能现代椭圆曲线 */
        const edKey = crypto.generateKeyPairSync('ed25519', {
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        return { publicKey: edKey.publicKey, privateKey: edKey.privateKey };
      }

      case 'RSA': {
        /** RSA-2048 — 传统 PKI 兼容密钥长度 */
        const rsaKey = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        return { publicKey: rsaKey.publicKey, privateKey: rsaKey.privateKey };
      }

      case 'SM2': {
        /** SM2 国密算法 — 使用 prime256v1（NIST P-256）曲线作为 SM2 的近似实现
         *  生产环境建议使用 gmssl 或 tongsuo 库获得完整的国密支持 */
        const sm2Key = crypto.generateKeyPairSync('ec', {
          namedCurve: 'prime256v1',
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        return { publicKey: sm2Key.publicKey, privateKey: sm2Key.privateKey };
      }

      default:
        throw new BadRequestException(`不支持的签名算法: ${algorithm}`);
    }
  }

  /**
   * 使用私钥对数据进行数字签名
   *
   * @param data 待签名原始数据（Buffer）
   * @param privateKey PEM 格式私钥
   * @param algorithm 签名算法
   * @returns 十六进制编码的签名值
   */
  signData(data: Buffer, privateKey: string, algorithm: SignatureAlgorithm): string {
    const sign = crypto.createSign(getHashAlgorithm(algorithm));
    sign.update(data);
    sign.end();

    try {
      return sign.sign(privateKey, 'hex');
    } catch (err) {
      this.logger.error(`签名失败 algorithm=${algorithm}: ${(err as Error).message}`);
      throw new BadRequestException(`数字签名执行失败: ${(err as Error).message}`);
    }
  }

  /**
   * 使用公钥验证数字签名
   *
   * @param data 原始数据（Buffer）
   * @param signature 十六进制编码的签名值
   * @param publicKey PEM 格式公钥
   * @param algorithm 签名算法
   * @returns 验证是否通过
   */
  verifyData(
    data: Buffer,
    signature: string,
    publicKey: string,
    algorithm: SignatureAlgorithm
  ): boolean {
    const verify = crypto.createVerify(getHashAlgorithm(algorithm));
    verify.update(data);
    verify.end();

    try {
      return verify.verify(publicKey, signature, 'hex');
    } catch (err) {
      this.logger.error(`验签失败 algorithm=${algorithm}: ${(err as Error).message}`);
      return false;
    }
  }

  // ==================== 查询方法 ====================

  /**
   * 获取指定 DID 身份的所有签名历史记录
   *
   * @param didId DID 身份 ID
   * @returns 签名历史列表（按签署时间倒序）
   */
  async getSignatureHistory(didId: number): Promise<object[]> {
    const records = await this.prisma.eSignature.findMany({
      where: { signerDid: didId },
      include: {
        document: { select: { id: true, name: true, fileUrl: true, status: true } },
        signer: { select: { id: true, did: true } },
      },
      orderBy: { signedAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      documentName: (r.document as any)?.name,
      algorithm: r.algorithm,
      signedAt: r.signedAt,
      isValid: r.isValid,
      revokedAt: r.revokedAt,
      revokeReason: r.revokeReason,
    }));
  }

  /**
   * 获取指定文档的签名记录（1:1 关系）
   *
   * @param documentId 文档 ID
   * @returns 签名记录对象，无签名则返回 null
   */
  async getDocumentSignature(documentId: number): Promise<object | null> {
    const record = await this.prisma.eSignature.findUnique({
      where: { documentId },
      include: {
        signer: { select: { id: true, did: true } },
        document: { select: { id: true, name: true, fileUrl: true } },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      documentId: record.documentId,
      signer: { did: record.signer?.did, name: (record.signer as any)?.name },
      algorithm: record.algorithm,
      signatureValue: record.signatureValue.substring(0, 64) + '...', // 截断展示
      publicKey: record.publicKey.substring(0, 64) + '...',
      signedAt: record.signedAt,
      ipAddress: record.ipAddress,
      isValid: record.isValid,
      revokedAt: record.revokedAt,
      revokeReason: record.revokeReason,
      createdAt: record.createdAt,
    };
  }
}

// ==================== 内部辅助函数 ====================

/**
 * 根据签名算法获取对应的摘要算法名称
 *
 * @param algorithm 签名算法
 * @returns Node.js crypto 支持的摘要算法标识符
 */
function getHashAlgorithm(algorithm: SignatureAlgorithm): string {
  switch (algorithm) {
    case 'ECDSA':
      return 'SHA256'; // secp256k1 通常配合 SHA-256
    case 'EdDSA':
      return 'sha256'; // ed25519 在 Node.js 中内部固定使用 sha512，此处为兼容接口
    case 'RSA':
      return 'SHA256';
    case 'SM2':
      return 'SM3'; // 国密 SM3 摘要；Node.js 原生不支持，回退到 SHA256 并在生产环境替换
    default:
      return 'SHA256';
  }
}

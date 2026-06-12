#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SQLite to PostgreSQL Data Export Script
========================================

This script exports data from a SQLite database and generates
PostgreSQL-compatible INSERT statements for migration.

Usage:
    python export-sqlite-to-postgres.py [options]

Options:
    --sqlite-db PATH       Path to SQLite database file (default: apps/api/prisma/dev.db)
    --output-file PATH     Output SQL file path (default: data-export-YYYYMMDD-HHMMSS.sql)
    --tables TABLES        Comma-separated list of tables to export (default: all)
    --exclude-tables TABLES Comma-separated list of tables to exclude
    --batch-size SIZE      Number of rows per batch (default: 1000)
    --include-schema       Include CREATE TABLE statements (default: False)
    --dry-run              Show what would be exported without writing file

Example:
    # Export all tables
    python export-sqlite-to-postgres.py

    # Export specific tables only
    python export-sqlite-to-postgres.py --tables admin_user,users,did_identities,wallet_accounts

    # Exclude audit logs (large table)
    python export-sqlite-to-postgres.py --exclude-tables did_audit_logs,audit_log_enhanced,login_history
"""

import sqlite3
import os
import sys
import argparse
from datetime import datetime
from typing import List, Tuple, Optional, Set


class SQLiteToPostgresExporter:
    """Export SQLite data to PostgreSQL-compatible SQL."""

    # Tables in priority order for migration
    PRIORITY_TABLES = [
        'admin_user',
        'admin_role',
        'users',
        'did_identities',
        'wallet_accounts',
        'wallet_nonces',
        'kyc_records',
        'sbt_credentials',
        'did_platform_permissions',
        'did_audit_logs',
        'dlc_level',
        'dvc_transaction',
        'company',
        'director',
        'shareholder',
        'bank_account',
        'payment_channel',
        'payment_transaction',
        'exchange_rate',
        'tax_rate',
        'legal_compliance',
        'contract',
        'ai_agent',
        'ai_message',
        'ai_todo',
        'ai_knowledge',
        'video',
        'video_comment',
        'media_post',
        'document',
        'business_card',
        'notification',
        'order',
        'system_config',
        # OpenClaw tables
        'openclaw_agent',
        'openclaw_marketplace_item',
        'openclaw_fine_tune',
        'openclaw_monitor_log',
        # n8n workflow tables
        'n8n_workflow',
        'n8n_trigger',
        'n8n_execution',
        'n8n_template',
        # AI Model integration tables
        'ai_model_provider',
        'ai_model_instance',
        'ai_smart_recognition',
        'ai_recommendation',
        'ai_prompt_template',
        'ai_model_cost_record',
        # BPM workflow tables
        'bpm_process_def',
        'bpm_process_instance',
        'bpm_task',
        'bpm_monitor_metric',
        # Acquisition module tables
        'acquisition_platform',
        'acquisition_api_config',
        'acquisition_campaign',
        'acquisition_content',
        'acquisition_lead',
        'acquisition_influencer',
        'acquisition_task',
        'acquisition_report',
        'acquisition_funnel',
        'acquisition_template',
        'acquisition_api_log',
        # AI TV module tables
        'ai_tv_digital_human',
        'ai_tv_news_source',
        'ai_tv_article',
        'ai_tv_schedule',
        'ai_tv_tts_config',
        'ai_tv_stream_push',
        'ai_tv_media_asset',
        'ai_tv_broadcast_log',
        # Live streaming tables
        'live_platform',
        'live_room',
        'live_stream',
        'live_schedule',
        'live_comment',
        'live_analytics',
        # Registration module tables
        'reg_domestic',
        'reg_overseas',
        'reg_privacy',
        'reg_contract',
        'domestic_registration_plan',
        'domestic_registration',
        'overseas_jurisdiction',
        'overseas_registration',
        'privacy_compliance_item',
        'registration_contract_template',
        'registration_contract',
        # Users enhancement tables
        'role',
        'user_role',
        'user_risk_assessment',
        'audit_log_enhanced',
        'user_session',
        'login_history',
        # DVSF pool tables
        'dvsf_pool',
        'dvsf_record',
        # Audit log (usually large, export last)
        'audit_log',
    ]

    def __init__(self, sqlite_db_path: str, output_file: Optional[str] = None,
                 batch_size: int = 1000):
        """
        Initialize exporter.

        Args:
            sqlite_db_path: Path to SQLite database file
            output_file: Output SQL file path (auto-generated if None)
            batch_size: Number of rows per INSERT batch
        """
        self.sqlite_db_path = os.path.abspath(sqlite_db_path)
        self.output_file = output_file or f"data-export-{datetime.now().strftime('%Y%m%d-%H%M%S')}.sql"
        self.batch_size = batch_size
        self.conn = None
        self.total_rows_exported = 0
        self.total_tables_exported = 0

    def connect(self) -> bool:
        """Connect to SQLite database."""
        try:
            if not os.path.exists(self.sqlite_db_path):
                print(f"❌ Error: Database file not found: {self.sqlite_db_path}")
                return False

            self.conn = sqlite3.connect(self.sqlite_db_path)
            self.conn.row_factory = sqlite3.Row
            print(f"✓ Connected to SQLite database: {self.sqlite_db_path}")
            return True
        except Exception as e:
            print(f"❌ Error connecting to database: {e}")
            return False

    def get_all_tables(self) -> List[str]:
        """Get all table names from the database."""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table'
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)
        return [row[0] for row in cursor.fetchall()]

    def get_table_columns(self, table_name: str) -> List[Tuple[str, str]]:
        """
        Get column names and types for a table.

        Returns:
            List of (column_name, column_type) tuples
        """
        cursor = self.conn.cursor()
        cursor.execute(f"PRAGMA table_info('{table_name}')")
        columns = [(row[1], row[2]) for row in cursor.fetchall()]
        return columns

    def escape_value(self, value, col_type: str) -> str:
        """
        Escape a value for PostgreSQL INSERT statement.

        Handles special characters and NULL values appropriately.
        """
        if value is None:
            return 'NULL'

        # Handle different types based on SQLite column type
        col_type_upper = col_type.upper()

        # Integer types
        if col_type_upper in ('INTEGER', 'INT', 'BIGINT', 'SMALLINT', 'TINYINT'):
            if isinstance(value, int):
                return str(value)
            else:
                try:
                    return str(int(value))
                except (ValueError, TypeError):
                    return f"'{self.escape_string(str(value))}'"

        # Float/Real types
        elif col_type_upper in ('REAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'DECIMAL'):
            if isinstance(value, (int, float)):
                return str(value)
            else:
                try:
                    return str(float(value))
                except (ValueError, TypeError):
                    return f"'{self.escape_string(str(value))}'"

        # Boolean type
        elif col_type_upper == 'BOOLEAN':
            if isinstance(value, bool):
                return 'TRUE' if value else 'FALSE'
            elif isinstance(value, int):
                return 'TRUE' if value != 0 else 'FALSE'
            else:
                val_str = str(value).lower()
                if val_str in ('true', '1', 'yes'):
                    return 'TRUE'
                elif val_str in ('false', '0', 'no'):
                    return 'FALSE'
                else:
                    return 'NULL'

        # BLOB type (binary data)
        elif col_type_upper == 'BLOB':
            if isinstance(value, bytes):
                return f"'\\x{value.hex()}'"
            else:
                return "'\\x00'"

        # Default: treat as string
        else:
            return f"'{self.escape_string(str(value))}'"

    def escape_string(self, s: str) -> str:
        """
        Escape special characters for PostgreSQL string literals.

        Handles single quotes, backslashes, null bytes, etc.
        """
        if s is None:
            return ''

        # Escape backslashes first (important!)
        escaped = s.replace('\\', '\\\\')

        # Escape single quotes by doubling them
        escaped = escaped.replace("'", "''")

        # Handle other special characters
        escaped = escaped.replace('\x00', '')  # Remove null bytes
        escaped = escaped.replace('\n', '\\n')
        escaped = escaped.replace('\r', '\\r')
        escaped = escaped.replace('\t', '\\t')

        return escaped

    def generate_insert_statement(self, table_name: str, columns: List[Tuple[str, str]],
                                  rows: List[sqlite3.Row]) -> str:
        """
        Generate INSERT INTO statement for a batch of rows.

        Returns:
            SQL INSERT statement as string
        """
        if not rows:
            return ''

        col_names = ', '.join([f'"{col[0]}"' for col in columns])
        values_list = []

        for row in rows:
            values = []
            for i, (col_name, col_type) in enumerate(columns):
                value = row[i]
                values.append(self.escape_value(value, col_type))

            values_list.append(f"({', '.join(values)})")

        # Split into batches if too many rows
        statements = []
        current_batch = []

        for value_tuple in values_list:
            current_batch.append(value_tuple)

            if len(current_batch) >= self.batch_size:
                sql = f"INSERT INTO \"{table_name}\" ({col_names}) VALUES\n  "
                sql += ",\n  ".join(current_batch)
                sql += " ON CONFLICT DO NOTHING;"
                statements.append(sql)
                current_batch = []

        # Add remaining rows
        if current_batch:
            sql = f"INSERT INTO \"{table_name}\" ({col_names}) VALUES\n  "
            sql += ",\n  ".join(current_batch)
            sql += " ON CONFLICT DO NOTHING;"
            statements.append(sql)

        return '\n\n'.join(statements)

    def export_table(self, table_name: str, output_file) -> Tuple[int, bool]:
        """
        Export a single table's data.

        Returns:
            Tuple of (row_count, success)
        """
        try:
            # Check if table exists
            cursor = self.conn.cursor()
            cursor.execute("""
                SELECT count(*) FROM sqlite_master
                WHERE type='table' AND name=?
            """, (table_name,))

            if cursor.fetchone()[0] == 0:
                print(f"  ⚠ Table '{table_name}' does not exist, skipping...")
                return 0, True

            # Get columns
            columns = self.get_table_columns(table_name)
            if not columns:
                print(f"  ⚠ Table '{table_name}' has no columns, skipping...")
                return 0, True

            # Count rows
            cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
            total_rows = cursor.fetchone()[0]

            if total_rows == 0:
                print(f"  ✓ Table '{table_name}': 0 rows (empty)")
                return 0, True

            # Fetch all data in chunks
            print(f"  📦 Exporting '{table_name}': {total_rows} rows...")

            offset = 0
            total_exported = 0

            while offset < total_rows:
                cursor.execute(f'SELECT * FROM "{table_name}" LIMIT ? OFFSET ?',
                             (self.batch_size, offset))
                rows = cursor.fetchall()

                if not rows:
                    break

                # Generate INSERT statement
                insert_sql = self.generate_insert_statement(table_name, columns, rows)

                if insert_sql:
                    output_file.write(f"\n-- ========================================\n")
                    output_file.write(f"-- Table: {table_name}\n")
                    output_file.write(f"-- Rows: {len(rows)} (offset {offset})\n")
                    output_file.write(f"-- ========================================\n\n")
                    output_file.write(insert_sql + "\n\n")
                    output_file.flush()

                total_exported += len(rows)
                offset += self.batch_size

                # Progress indicator
                progress = min(offset, total_rows)
                pct = (progress / total_rows) * 100
                print(f"    Progress: {progress}/{total_rows} ({pct:.1f}%)", end='\r')

            print(f"\n  ✓ Table '{table_name}': {total_exported} rows exported")
            return total_exported, True

        except Exception as e:
            print(f"  ❌ Error exporting table '{table_name}': {e}")
            import traceback
            traceback.print_exc()
            return 0, False

    def export_all_tables(self, tables: Optional[List[str]] = None,
                         exclude_tables: Optional[List[str]] = None,
                         include_schema: bool = False,
                         dry_run: bool = False) -> bool:
        """
        Export all specified tables to SQL file.

        Args:
            tables: List of tables to export (None = all)
            exclude_tables: List of tables to exclude
            include_schema: Whether to include CREATE TABLE statements
            dry_run: If True, don't write to file

        Returns:
            Success status
        """
        # Get available tables
        all_tables = self.get_all_tables()

        # Filter tables
        if tables:
            # Use provided list
            export_tables = [t.lower() for t in tables]
        else:
            # Use all tables, sorted by priority
            export_tables = []
            for table in self.PRIORITY_TABLES:
                if table.lower() in [t.lower() for t in all_tables]:
                    export_tables.append(table)

            # Add any remaining tables not in priority list
            for table in all_tables:
                if table.lower() not in [t.lower() for t in export_tables]:
                    export_tables.append(table)

        # Exclude tables
        if exclude_tables:
            exclude_set = set(t.lower() for t in exclude_tables)
            export_tables = [t for t in export_tables if t.lower() not in exclude_set]

        if dry_run:
            print("\n🔍 DRY RUN MODE - No files will be created\n")
            print("Tables to export:")
            for table in export_tables:
                print(f"  - {table}")
            print(f"\nTotal tables: {len(export_tables)}")
            return True

        # Open output file
        try:
            output_path = os.path.abspath(self.output_file)
            with open(output_path, 'w', encoding='utf-8') as f:
                # Write header
                f.write("-- ============================================================\n")
                f.write("-- SQLite to PostgreSQL Data Migration Script\n")
                f.write("-- Generated: " + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "\n")
                f.write("-- Source DB: " + self.sqlite_db_path + "\n")
                f.write("-- Total Tables: " + str(len(export_tables)) + "\n")
                f.write("-- ============================================================\n\n")

                f.write("-- Start transaction\nBEGIN;\n\n")

                # Optionally include schema
                if include_schema:
                    self._export_schema(f, export_tables)

                # Export each table
                for table_name in export_tables:
                    row_count, success = self.export_table(table_name, f)
                    if success:
                        self.total_rows_exported += row_count
                        self.total_tables_exported += 1

                # Write footer
                f.write("\n-- Commit transaction\nCOMMIT;\n\n")
                f.write("-- ============================================================\n")
                f.write("-- Migration Summary\n")
                f.write(f"-- Tables exported: {self.total_tables_exported}\n")
                f.write(f"-- Total rows: {self.total_rows_exported}\n")
                f.write("-- ============================================================\n")

            print(f"\n✅ Export completed successfully!")
            print(f"   Output file: {output_path}")
            print(f"   Tables: {self.total_tables_exported}")
            print(f"   Rows: {self.total_rows_exported}")

            return True

        except Exception as e:
            print(f"\n❌ Error during export: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _export_schema(self, output_file, tables: List[str]):
        """Export CREATE TABLE statements."""
        output_file.write("\n-- ============================================================\n")
        output_file.write("-- Schema Definition (for reference only)\n")
        output_file.write("-- Note: Use Prisma Migrate for actual schema creation\n")
        output_file.write("-- ============================================================\n\n")

        cursor = self.conn.cursor()

        for table_name in tables:
            try:
                cursor.execute("""
                    SELECT sql FROM sqlite_master
                    WHERE type='table' AND name=?
                """, (table_name,))
                result = cursor.fetchone()

                if result and result[0]:
                    output_file.write(f"-- Original SQLite schema for: {table_name}\n")
                    output_file.write(f"{result[0]};\n\n")
            except Exception as e:
                output_file.write(f"-- Could not retrieve schema for {table_name}: {e}\n\n")

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            print(f"\n✓ Database connection closed")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Export SQLite data to PostgreSQL-compatible SQL',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                    # Export all tables
  %(prog)s --tables users,did_identities      # Export specific tables
  %(prog)s --exclude-tables audit_logs         # Exclude large tables
  %(prog)s --dry-run                           # Preview without exporting
  %(prog)s --batch-size 500                    # Smaller batches
        """
    )

    parser.add_argument(
        '--sqlite-db',
        default='apps/api/prisma/dev.db',
        help='Path to SQLite database file (default: apps/api/prisma/dev.db)'
    )
    parser.add_argument(
        '--output-file',
        help='Output SQL file path (auto-generated if not specified)'
    )
    parser.add_argument(
        '--tables',
        help='Comma-separated list of tables to export (default: all)'
    )
    parser.add_argument(
        '--exclude-tables',
        help='Comma-separated list of tables to exclude'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=1000,
        help='Number of rows per INSERT batch (default: 1000)'
    )
    parser.add_argument(
        '--include-schema',
        action='store_true',
        help='Include CREATE TABLE statements in output'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be exported without creating file'
    )

    args = parser.parse_args()

    # Parse table lists
    tables = args.tables.split(',') if args.tables else None
    exclude_tables = args.exclude_tables.split(',') if args.exclude_tables else None

    # Create exporter
    exporter = SQLiteToPostgresExporter(
        sqlite_db_path=args.sqlite_db,
        output_file=args.output_file,
        batch_size=args.batch_size
    )

    # Connect and export
    if exporter.connect():
        success = exporter.export_all_tables(
            tables=tables,
            exclude_tables=exclude_tables,
            include_schema=args.include_schema,
            dry_run=args.dry_run
        )
        exporter.close()
        sys.exit(0 if success else 1)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()

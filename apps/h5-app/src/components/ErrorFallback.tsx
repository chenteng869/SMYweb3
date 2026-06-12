import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, error: err.message + '\n' + err.stack };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 20,
            color: '#F6A623',
            background: '#0A0E1A',
            minHeight: '100vh',
            whiteSpace: 'pre-wrap',
          }}
        >
          <h2 style={{ color: '#CE1126' }}>Render Error:</h2>
          <code>{this.state.error}</code>
        </div>
      );
    }
    return this.props.children;
  }
}

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="flex flex-col items-center justify-center p-6 bg-[#0a0a0f] rounded-3xl border border-red-500/30 w-full max-w-lg mx-auto text-center animate-in fade-in zoom-in-95 duration-300 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          
          <h2 className="text-xl font-black text-red-500 mb-2 tracking-tight">Component Crashed</h2>
          <p className="text-sm text-red-400 mb-4 max-w-[400px]">
            The <b>{this.props.name || "application"}</b> encountered an unexpected error and had to shutdown its interface.
          </p>

          <div className="w-full bg-black/50 border border-red-500/20 rounded-xl p-4 mb-6 overflow-x-auto text-left shadow-inner">
            <p className="text-xs font-mono text-red-300 break-words whitespace-pre-wrap">{this.state.error?.toString()}</p>
            {this.state.errorInfo && (
              <details className="mt-3">
                <summary className="text-[10px] text-red-400/70 font-bold uppercase tracking-widest cursor-pointer hover:text-red-300 transition-colors">
                  View Stack Trace
                </summary>
                <p className="text-[9px] font-mono text-red-400/50 mt-2 whitespace-pre-wrap leading-relaxed border-t border-red-500/10 pt-2">
                  {this.state.errorInfo.componentStack}
                </p>
              </details>
            )}
          </div>

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-sm tracking-wider uppercase rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          >
            <RefreshCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
        </div>
      );
    }

    return this.props.children;
  }
}

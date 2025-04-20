import "./ErrorBoundary.css";

import React, { ReactNode, Component, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    }

    interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    }

    class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
        return (
            <div className="error-boundary">
            <h2>Something went wrong.</h2>
            <p>{this.state.error && this.state.error.toString()}</p>
            </div>
        );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;


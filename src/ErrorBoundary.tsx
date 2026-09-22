import React from 'react';

type ErrorBoundaryProps = React.PropsWithChildren;
type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Diagnostics remain available in developer tools without exposing stack
    // traces or local implementation details to visitors.
    console.error('Application render error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen w-full bg-[#fafafa] text-black flex items-center justify-center p-6">
          <section className="w-full max-w-xl border border-black/10 bg-white p-8 md:p-12 shadow-[0_24px_80px_rgba(0,0,0,0.08)] text-center">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.24em] text-black/45">Tom Fox Catalog</p>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold uppercase tracking-tighter leading-[0.9]">Let’s try that again.</h1>
            <p className="mt-6 text-sm md:text-base leading-relaxed text-black/60">
              Something interrupted this page. Your music and account are safe—please reload and continue where you left off.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
              <button onClick={() => this.setState({ hasError: false })} className="bg-black px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-black/85">Try again</button>
              <button onClick={() => window.location.reload()} className="border border-black/15 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black/5">Reload page</button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

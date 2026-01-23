import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1 px-4">
      <h1 className="text-4xl font-bold mb-4">Onera Documentation</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
        Privacy-focused AI chat with true end-to-end encryption. 
        Your data is encrypted on your device before it ever leaves.
      </p>
      <div className="flex gap-4 justify-center">
        <Link 
          href="/docs" 
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Read Documentation
        </Link>
        <Link 
          href="/docs/whitepaper" 
          className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          E2EE Whitepaper
        </Link>
      </div>
    </div>
  );
}

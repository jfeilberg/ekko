export default function SetupPage() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '4rem', maxWidth: '40rem' }}>
      <h1>Ekko setup</h1>
      <p>
        Setup is a one-command CLI flow, not a web wizard. From any terminal:
      </p>
      <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '0.5rem' }}>
        npx create-ekko-agent my-agent
      </pre>
      <p>
        Or if you've already cloned this repo, just run <code>pnpm bootstrap</code>.
      </p>
      <p>
        See the <a href="https://github.com/jfeilberg/ekko#first-time-setup">README</a>{' '}
        for details.
      </p>
    </main>
  );
}

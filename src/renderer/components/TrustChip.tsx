export default function TrustChip({ text = 'Nothing leaves this device' }: { text?: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        color: 'var(--pb-sage-deep)',
        background: 'var(--pb-sage-bg)',
        padding: '5px 10px',
        borderRadius: 20,
      }}
    >
      {text}
    </span>
  )
}

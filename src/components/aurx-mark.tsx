import markAsset from '@/assets/aurx-mark.png.asset.json'

/**
 * AURX brand mark — just the X monogram (transparent bg), no wordmark.
 * The parent controls sizing; we keep aspect ratio and let it breathe.
 */
export function AurxMark({ className }: { className?: string }) {
  return (
    <img
      src={markAsset.url}
      alt="AURX"
      className={className}
      draggable={false}
      style={{ objectFit: 'contain', width: '100%', height: '100%' }}
    />
  )
}

export default function PortalFooter({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`text-[11px] text-textMuted ${compact ? 'mt-2 px-2' : 'py-4 text-center'}`}>
      © 2026 Tax Sole Trader™. All rights reserved.
    </p>
  );
}

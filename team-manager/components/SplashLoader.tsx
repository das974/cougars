import Image from 'next/image';

export default function SplashLoader({ isExiting = false }: { isExiting?: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-50 bg-zinc-900 transition-opacity duration-200 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/cougars_background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.22,
        }}
      />

      {/* Logo — centred independently */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/cougars.avif"
          alt=""
          width={120}
          height={120}
          className="opacity-30 drop-shadow-[0_0_48px_rgba(207,55,90,0.5)]"
          priority
        />
      </div>

      {/* Spinner + label — centred independently, spinner offset below centre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
        <div style={{ marginTop: '140px' }}>
          <div className="three-body" role="status" aria-label="Loading">
            <div className="three-body__dot" />
            <div className="three-body__dot" />
            <div className="three-body__dot" />
          </div>
        </div>
        <p className="text-[10px] font-semibold text-zinc-600 tracking-[0.35em] uppercase">
          Cougars Hockey
        </p>
      </div>
    </div>
  );
}

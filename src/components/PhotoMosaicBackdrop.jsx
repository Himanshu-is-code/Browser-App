const tiles = [
  'bg-[radial-gradient(ellipse_at_30%_20%,#2e8de9_0%,transparent_44%),radial-gradient(ellipse_at_80%_70%,#051b5a_0%,transparent_52%),linear-gradient(135deg,#061747,#1476d2_48%,#030b26)]',
  'bg-[radial-gradient(ellipse_at_75%_30%,#f6bd43_0%,transparent_24%),radial-gradient(ellipse_at_28%_65%,#9b441d_0%,transparent_38%),linear-gradient(130deg,#172c4b,#d9872a_48%,#321b28)]',
  'bg-[radial-gradient(ellipse_at_68%_40%,#dfbaff_0%,transparent_18%),radial-gradient(ellipse_at_50%_65%,#7651c9_0%,transparent_46%),linear-gradient(140deg,#1e124d,#a78aea_60%,#382263)]',
  'bg-[radial-gradient(ellipse_at_20%_25%,#d9efff_0%,transparent_38%),linear-gradient(170deg,#537cae_0%,#c7e1f0_48%,#644554_100%)]',
  'bg-[radial-gradient(ellipse_at_48%_90%,#e2e1dc_0%,transparent_30%),linear-gradient(180deg,#2c3138,#85888d_48%,#d5d3cc)]',
  'bg-[radial-gradient(ellipse_at_70%_45%,#fff6cb_0%,transparent_25%),radial-gradient(ellipse_at_45%_50%,#f3e9bf_0%,transparent_50%),linear-gradient(145deg,#c5c99b,#f0ebd3_55%,#8d9a73)]',
];

export default function PhotoMosaicBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto h-[66vh] w-full overflow-hidden rounded-b-[38px] border-b border-white/60 shadow-[0_30px_90px_rgba(50,67,103,0.14)] sm:h-[76vh] sm:w-[84vw] sm:max-w-[1640px] sm:rounded-b-[100px]">
      <div className="grid h-full grid-cols-2 grid-rows-3 gap-[3px] bg-white/70 p-[3px] sm:grid-cols-3 sm:grid-rows-2">
        {tiles.map((tile, index) => <div key={index} className={`relative overflow-hidden ${tile}`}>
          <div className="absolute inset-0 opacity-25 mix-blend-soft-light" style={{ backgroundImage: 'repeating-linear-gradient(125deg, transparent 0 8px, rgba(255,255,255,.15) 9px, transparent 10px 17px)' }} />
          {index === 2 && <span className="absolute right-[12%] top-[23%] h-[34%] w-[34%] rounded-full bg-gradient-to-br from-emerald-300/80 via-yellow-300/75 to-orange-400/80 blur-[2px]" />}
          {index === 4 && <span className="absolute inset-x-[10%] bottom-0 h-[46%] rounded-t-[50%] bg-gradient-to-b from-white/10 to-white/50 blur-sm" />}
          {index === 5 && <span className="absolute left-[30%] top-[15%] h-[58%] w-[42%] rounded-full bg-white/50 blur-xl" />}
        </div>)}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F3F5F7]/30" />
    </div>
  );
}

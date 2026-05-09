import { useGardenStore } from '../store';

export default function PosterMode() {
  const { posterMode, posterTitle, posterArtist, setPosterMode, randomizePosterText } = useGardenStore();

  if (!posterMode) return null;

  return (
    <div className="poster-overlay active">
      <div className="poster-frame">
        <button className="poster-close" onClick={() => setPosterMode(false)}>
          ✕
        </button>
        <div className="poster-content">
          <div className="poster-title">{posterTitle}</div>
          <div className="poster-artist">{posterArtist}</div>
        </div>
        <div className="poster-actions">
          <button className="poster-btn" onClick={randomizePosterText}>
            Randomize
          </button>
        </div>
      </div>
    </div>
  );
}

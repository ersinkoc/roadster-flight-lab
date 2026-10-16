"use client";
import { useState } from "react";

const videos = [
  { id: "cvKIR-c1SsU", title: "Roadster | The Last Best Driver’s Car" },
  { id: "7p5LxFdc-Qg", title: "The Ramp | Roadster" },
];
export default function OfficialMedia() {
  const [selected, setSelected] = useState(0);
  const video = videos[selected];
  return <>
    <span className="eyebrow">REAL CAR / OFFICIAL TESLA FOOTAGE</span>
    <h2 id="modal-title">The actual Roadster.</h2>
    <p>Real footage from Tesla. Choose the design film or the ramp demonstration.</p>
    <div className="official-video-tabs">
      {videos.map((v, i) => <button key={v.id} aria-pressed={selected === i} onClick={() => setSelected(i)}>
        {i === 0 ? "Design film" : "Ramp demonstration"}
      </button>)}
    </div>
    <iframe key={video.id} className="official-player" title={`Tesla — ${video.title}`}
      src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    <p className="official-media-credit">Video © Tesla. <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">Watch on Tesla’s YouTube channel ↗</a></p>
  </>;
}

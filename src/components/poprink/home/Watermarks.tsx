import { poprinkConfig } from "../config.poprink";

interface WatermarksProps {
  renderMixedText: (text: string) => React.ReactNode;
  locale: string;
  t: Record<string, string>;
}

export default function Watermarks({ renderMixedText, locale, t }: WatermarksProps) {
  const siteName = poprinkConfig.logo?.text || "poprink";
  
  let moviesAndShows = "movies and shows";
  if (locale === "ar") {
    moviesAndShows = "أفلام ومسلسلات";
  } else if (locale === "zh") {
    moviesAndShows = "电影和电视剧";
  } else if (locale === "es") {
    moviesAndShows = "películas y series";
  } else if (locale === "ko") {
    moviesAndShows = "영화 및 프로그램";
  } else if (locale === "ja") {
    moviesAndShows = "映画と番組";
  } else if (locale === "hi") {
    moviesAndShows = "फिल्में और शो";
  } else if (locale === "th") {
    moviesAndShows = "ภาพยนตร์และรายการ";
  } else if (locale === "tr") {
    moviesAndShows = "filmler ve şovlar";
  } else if (locale === "ru") {
    moviesAndShows = "фильмы и сериалы";
  } else if (locale === "fr") {
    moviesAndShows = "films et séries";
  } else if (locale === "de") {
    moviesAndShows = "filme und serien";
  } else {
    const moviesPart = (t.movies || "movies").toLowerCase();
    const tvPart = (t.tvShows || "shows").toLowerCase();
    moviesAndShows = `${moviesPart} and ${tvPart}`;
  }

  return (
    <>
      <div className="nano-watermark-container">
        <div className="nano-bottom-cutoff">
          {renderMixedText(siteName)}
        </div>
      </div>

      <div className="nano-watermark-container-right">
        <div className="nano-bottom-cutoff-right">
          {renderMixedText(moviesAndShows)}
        </div>
      </div>
    </>
  );
}

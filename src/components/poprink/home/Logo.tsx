import { NANO_PET_BODY_PATH, NANO_PET_VIEWBOX } from "../ui/nano-pet-shape"

export default function Logo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={NANO_PET_VIEWBOX}
      className="nano-site-logo"
      aria-hidden="true"
    >
      <path className="nano-site-logo-body" d={NANO_PET_BODY_PATH} />
      <ellipse className="nano-site-logo-eye" cx="80" cy="120" rx="20" ry="30" />
      <ellipse className="nano-site-logo-eye" cx="150" cy="120" rx="20" ry="30" />
    </svg>
  )
}

import {
  instagramProfileUrl,
  isValidInstagramUsername,
} from "../utils/instagram";
import { openInChrome } from "../utils/openInChrome";

type Props = {
  username: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

export function InstagramLink({ username, className = "", onClick }: Props) {
  if (!isValidInstagramUsername(username)) return null;

  const url = instagramProfileUrl(username);

  return (
    <a
      href={url}
      className={`ig-link ${className}`.trim()}
      title="Abrir en Chrome"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openInChrome(url);
        onClick?.(e);
      }}
    >
      @{username}
    </a>
  );
}

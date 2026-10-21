import { NotFoundMessage } from "@/components/not-found-message";

// Shown inside the app's frame when a page calls notFound(), e.g. for a visit that doesn't exist.
export default function NotFound() {
  return <NotFoundMessage />;
}

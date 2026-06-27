import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4">
      <div className="text-8xl font-black text-primary/20 tracking-wider">404</div>
      <div>
        <h1 className="text-3xl font-black text-foreground">Wrong Turn! 🚧</h1>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
          The page you are looking for is off-route, has been moved, or doesn't exist.
        </p>
      </div>
      <Link
        to="/"
        className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the Showroom
      </Link>
    </div>
  );
}
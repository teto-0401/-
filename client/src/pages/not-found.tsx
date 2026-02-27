import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardContent className="pt-10 pb-8 px-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">
            404 Page Not Found
          </h1>
          <p className="text-muted-foreground mb-8 text-lg">
            The route you're looking for doesn't exist in this application.
          </p>
          <Link href="/" className="w-full">
            <Button className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
              Return to Browser
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

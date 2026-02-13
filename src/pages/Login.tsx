import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Rankito</h1>
          <p className="text-sm text-muted-foreground">SEO & Analytics Intelligence</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{isSignup ? "Create account" : "Welcome back"}</CardTitle>
            <CardDescription className="text-xs">
              {isSignup ? "Start analyzing your sites" : "Sign in to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSignup && (
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input placeholder="Your name" className="h-9 text-sm" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="you@company.com" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input type="password" placeholder="••••••••" className="h-9 text-sm" />
            </div>
            <Button className="w-full h-9 text-sm" onClick={() => navigate("/overview")}>
              {isSignup ? "Create account" : "Sign in"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button className="text-primary font-medium hover:underline" onClick={() => setIsSignup(!isSignup)}>
                {isSignup ? "Sign in" : "Sign up"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

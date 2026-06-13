import { Suspense } from "react";
import { LoginRedirect } from "@/components/auth/login-redirect";
import { LoginForm } from "@/components/auth/login-form";
import { siteConfig } from "@/config/site.config";
import { wardConfig } from "@/config/ward.config";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
            LB
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            {siteConfig.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {wardConfig.name} — {wardConfig.district}, {wardConfig.city}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-medium text-foreground">
            Đăng nhập
          </h2>
          <LoginRedirect>
            <Suspense fallback={<p className="text-sm text-muted">Đang tải...</p>}>
              <LoginForm />
            </Suspense>
          </LoginRedirect>
        </div>
      </div>
    </div>
  );
}

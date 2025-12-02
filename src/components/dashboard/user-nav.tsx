import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

export async function UserNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const signOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{user.email}</span>
      <form action={signOut}>
        <Button variant="ghost" size="sm">
          Sign Out
        </Button>
      </form>
    </div>
  );
}

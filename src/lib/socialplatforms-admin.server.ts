export async function assertSocialPlatformsAdmin(context: {
  supabase: {
    rpc: (
      functionName: string,
      parameters: Record<string, string>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

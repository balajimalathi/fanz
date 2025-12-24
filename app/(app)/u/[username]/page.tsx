export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return (
    <div className="p-4">
      <h1>Hello {username}</h1>
    </div>
  )
}

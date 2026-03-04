interface Props { username: string; }
export default function PublicProfilePage({ username }: Props) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-display font-bold text-white mb-2">{username}</h1>
      <p className="text-[#848E9C] text-sm">用户公开资料</p>
      <div className="mt-6 bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
        <p className="text-[#848E9C] text-xs">公开资料页即将实现</p>
      </div>
    </div>
  );
}

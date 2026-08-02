import Link from "next/link";
import { reagir } from "../../actions";
import type { FeedPost } from "@/lib/queries";
import { quando } from "@/lib/quando";

export const REACTS = ["🔥", "👏", "💪", "🎯"] as const;

export function Post({ post, viewer }: { post: FeedPost; viewer: string }) {
  const meu = !post.isTeacher && post.nickname === viewer;

  return (
    <article className="post" data-prof={post.isTeacher ? "1" : "0"}>
      <div className="post-head">
        <span className="nick">
          {post.nickname}
          {meu ? " · você" : ""}
        </span>
        {post.isTeacher ? <span className="prof-badge">professor</span> : null}
        <span className="tag">
          {post.activityName} · {post.points}
        </span>
        <span className="when">{quando(post.createdAt)}</span>
      </div>

      {post.note ? <p className="post-note">{post.note}</p> : null}

      {post.teacherReaction && !post.isTeacher ? (
        <div className="prof-react">{post.teacherReaction} Prof. Sam reagiu</div>
      ) : null}

      <div className="reacts">
        {REACTS.map((emoji) => {
          const total = post.reactions[emoji] ?? 0;
          const mine = post.mine.includes(emoji);
          return (
            <form action={reagir} key={emoji}>
              <input type="hidden" name="checkin" value={post.id} />
              <input type="hidden" name="emoji" value={emoji} />
              <button className="react" type="submit" data-on={mine ? "1" : "0"}>
                {emoji}
                {total > 0 ? <b>{total}</b> : null}
              </button>
            </form>
          );
        })}

        {!meu ? (
          <Link
            className="react react-also"
            href={`/hoje?atividade=${post.activityId}&sugestao=${encodeURIComponent(post.note ?? "")}`}
          >
            Fazer também
          </Link>
        ) : null}
      </div>

      {post.teacherComment ? (
        <div className="prof-note">
          <strong>Prof. Sam</strong>
          <span>{post.teacherComment}</span>
        </div>
      ) : null}
    </article>
  );
}

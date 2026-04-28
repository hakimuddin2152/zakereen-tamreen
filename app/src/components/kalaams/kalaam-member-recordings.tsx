"use client";

import { AudioPlayer } from "@/components/evaluations/audio-player";
import { RecordingFeedbackPanel } from "@/components/recordings/recording-feedback-panel";
import { KalaamMemberEvalDialog } from "@/components/kalaams/kalaam-member-eval-dialog";
import { formatDate } from "@/lib/utils-date";

interface FeedbackAuthor {
  id: string;
  displayName: string;
  role: string;
}

interface Feedback {
  id: string;
  authorId: string;
  comment: string | null;
  ranking: number | null;
  audioFileKey: string | null;
  audioFileName: string | null;
  createdAt: string | Date;
  author: FeedbackAuthor;
}

interface Recording {
  id: string;
  fileKey: string;
  fileName: string;
  createdAt: Date;
  feedbacks: Feedback[];
}

interface Evaluation {
  id: string;
  ranking: number | null;
  voiceRange: string | null;
  notes: string | null;
}

interface MemberGroup {
  memberId: string;
  memberName: string;
  recordings: Recording[];
  eval: Evaluation | null;
}

interface Props {
  kalaamId: string;
  memberGroups: MemberGroup[];
}

export function KalaamMemberRecordings({ kalaamId, memberGroups }: Props) {
  if (memberGroups.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-muted-foreground text-sm">
        No members have uploaded recordings for this kalaam yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {memberGroups.map((g) => (
        <div key={g.memberId} className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-foreground">{g.memberName}</p>
            <KalaamMemberEvalDialog
              kalaamId={kalaamId}
              memberId={g.memberId}
              memberName={g.memberName}
              existingEval={g.eval}
            />
          </div>

          {g.eval && (
            <div className="mb-3 px-3 py-2 rounded-md bg-secondary/40 border border-border text-xs space-y-0.5">
              <span className="text-muted-foreground font-medium">Evaluation: </span>
              {g.eval.ranking ? <span>{"★".repeat(g.eval.ranking)}{"☆".repeat(5 - g.eval.ranking)}</span> : null}
              {g.eval.voiceRange ? <span className="ml-2 text-muted-foreground">· {g.eval.voiceRange}</span> : null}
              {g.eval.notes ? <p className="text-muted-foreground mt-0.5">{g.eval.notes}</p> : null}
            </div>
          )}

          <div className="space-y-4 pl-2 border-l border-border">
            {g.recordings.map((r, i) => (
              <div key={r.id} className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  #{g.recordings.length - i} · {formatDate(r.createdAt)}
                </span>
                <AudioPlayer fileKey={r.fileKey} fileName={r.fileName} />
                <RecordingFeedbackPanel
                  kalaamId={kalaamId}
                  recordingId={r.id}
                  isCoordinator={true}
                  initialFeedbacks={r.feedbacks}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

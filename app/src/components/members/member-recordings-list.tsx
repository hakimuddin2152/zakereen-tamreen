"use client";

import { AudioPlayer } from "@/components/evaluations/audio-player";
import { RecordingFeedbackPanel } from "@/components/recordings/recording-feedback-panel";
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

interface KalaamGroup {
  kalaamId: string;
  kalaamTitle: string;
  kalaamCategory: string;
  recordings: Recording[];
}

interface Props {
  memberId: string;
  groups: KalaamGroup[];
  isCoordinator: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  MARASIYA: "Marasiya",
  MATEMI: "Matemi",
  SALAAM: "Salaam",
  MADEH: "Madeh",
  MISC: "Misc",
};

export function MemberRecordingsList({ groups, isCoordinator }: Props) {
  if (groups.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-muted-foreground text-sm">
        No practice recordings yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {groups.map((g) => (
        <div key={g.kalaamId} className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {CATEGORY_LABELS[g.kalaamCategory] ?? g.kalaamCategory}
            </span>
            <span className="text-foreground font-semibold">{g.kalaamTitle}</span>
            <span className="text-muted-foreground text-xs">
              ({g.recordings.length} recording{g.recordings.length !== 1 ? "s" : ""})
            </span>
          </div>

          <div className="space-y-3 pl-2 border-l border-border">
            {g.recordings.map((r, i) => (
              <div key={r.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    #{g.recordings.length - i} · {formatDate(r.createdAt)}
                  </span>
                </div>
                <AudioPlayer fileKey={r.fileKey} fileName={r.fileName} />
                <RecordingFeedbackPanel
                  kalaamId={g.kalaamId}
                  recordingId={r.id}
                  isCoordinator={isCoordinator}
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

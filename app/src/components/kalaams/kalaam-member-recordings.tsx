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

interface MemberGroup {
  memberId: string;
  memberName: string;
  recordings: Recording[];
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
          <p className="font-semibold text-foreground mb-3">{g.memberName}</p>

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

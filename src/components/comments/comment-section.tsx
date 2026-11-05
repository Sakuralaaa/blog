'use client'

import { useState } from 'react'
import { CommentForm, type CommentSubmission } from './comment-form'
import { CommentList } from './comment-list'

interface CommentSectionProps {
  postSlug: string
  allowGuest?: boolean
  defaultAvatarUrl?: string
  unlockToken?: string
}

export function CommentSection({ postSlug, allowGuest, defaultAvatarUrl, unlockToken }: CommentSectionProps) {
  const [submittedComment, setSubmittedComment] = useState<CommentSubmission>()

  return (
    <section className="comments" aria-label="评论">
      <CommentForm
        postSlug={postSlug}
        allowGuest={!!allowGuest}
        onSuccess={setSubmittedComment}
        unlockToken={unlockToken}
      />
      <CommentList
        postSlug={postSlug}
        submittedComment={submittedComment}
        defaultAvatarUrl={defaultAvatarUrl}
        allowGuest={allowGuest}
        unlockToken={unlockToken}
      />
    </section>
  )
}

ALTER TABLE "account" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "session_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_sessions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chat_sessions" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_sessions" ALTER COLUMN "notebook_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_sessions" ALTER COLUMN "created_by_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "material_chunks" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "material_chunks" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "material_chunks" ALTER COLUMN "material_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "notebook_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "created_by_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mindmap_nodes" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mindmap_nodes" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "mindmap_nodes" ALTER COLUMN "mindmap_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mindmap_nodes" ALTER COLUMN "parent_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mindmap_nodes" ALTER COLUMN "material_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mindmap_nodes" ALTER COLUMN "material_chunk_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mindmaps" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mindmaps" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "mindmaps" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mindmaps" ALTER COLUMN "notebook_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "mindmaps" ALTER COLUMN "created_by_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notebooks" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notebooks" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "notebooks" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notebooks" ALTER COLUMN "created_by_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pyq_papers" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pyq_papers" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "pyq_papers" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pyq_papers" ALTER COLUMN "created_by_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pyq_questions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pyq_questions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "pyq_questions" ALTER COLUMN "paper_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pyq_questions" ALTER COLUMN "quiz_question_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_answers" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_answers" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "quiz_answers" ALTER COLUMN "attempt_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_answers" ALTER COLUMN "question_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_answers" ALTER COLUMN "selected_option_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ALTER COLUMN "quiz_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_options" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_options" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "quiz_options" ALTER COLUMN "question_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "quiz_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "material_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "material_chunk_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "notebook_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "material_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "created_by_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "customer_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "created_by_user_id" SET DATA TYPE text;
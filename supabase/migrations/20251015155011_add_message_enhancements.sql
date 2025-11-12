/*
  # Message System Enhancements

  ## Overview
  Adds enhanced messaging features including typing indicators, read receipts tracking,
  and additional conversation metadata for a complete messenger experience.

  ## New Tables

  ### 1. `typing_indicators`
  Tracks real-time typing status of users in conversations
  - `id` (uuid, primary key)
  - `conversation_id` (uuid) - references conversations
  - `user_id` (uuid) - user who is typing
  - `updated_at` (timestamptz) - last typing activity timestamp

  ## Modified Tables

  ### `conversations`
  - Added `unread_count_user1` (integer) - unread messages for user1
  - Added `unread_count_user2` (integer) - unread messages for user2

  ### `messages`
  - Added `read_at` (timestamptz) - timestamp when message was read
  - Added index on `is_read` for faster queries

  ## Database Functions

  ### `mark_messages_as_read`
  Function to mark all messages in a conversation as read for the current user
  and update unread counts.

  ### `update_conversation_timestamp`
  Trigger function to automatically update last_message_at when new message is sent.

  ## Security

  - RLS policies added for typing_indicators table
  - Only conversation participants can view/update typing status
  - Read receipts only visible to conversation participants

  ## Performance

  - Added indexes on conversation_id for typing_indicators
  - Added index on is_read for messages table
  - Added composite index on (conversation_id, is_read) for messages

  ## Notes

  - Typing indicators automatically expire after 5 seconds (handled in application)
  - Unread counts are maintained via database triggers for accuracy
  - Read receipts track exact timestamp for future features
*/

-- Add unread count columns to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'unread_count_user1'
  ) THEN
    ALTER TABLE conversations ADD COLUMN unread_count_user1 integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'unread_count_user2'
  ) THEN
    ALTER TABLE conversations ADD COLUMN unread_count_user2 integer DEFAULT 0;
  END IF;
END $$;

-- Add read_at column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN read_at timestamptz;
  END IF;
END $$;

-- Create typing_indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read ON messages(conversation_id, is_read);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_id ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Enable RLS on typing_indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Typing indicators policies
CREATE POLICY "Users can view typing in their conversations"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = typing_indicators.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own typing status"
  ON typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their typing timestamp"
  ON typing_indicators FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own typing status"
  ON typing_indicators FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add policy to allow users to update messages as read
CREATE POLICY "Users can mark messages as read in their conversations"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update messages to mark as read
  UPDATE messages
  SET is_read = true, read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = false;

  -- Update unread count in conversations
  UPDATE conversations
  SET 
    unread_count_user1 = CASE 
      WHEN user1_id = p_user_id THEN 0 
      ELSE unread_count_user1 
    END,
    unread_count_user2 = CASE 
      WHEN user2_id = p_user_id THEN 0 
      ELSE unread_count_user2 
    END
  WHERE id = p_conversation_id;
END;
$$;

-- Function to update conversation timestamp and unread counts
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation conversations%ROWTYPE;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Update last_message_at and increment unread count for recipient
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    unread_count_user1 = CASE 
      WHEN v_conversation.user1_id != NEW.sender_id THEN unread_count_user1 + 1
      ELSE unread_count_user1
    END,
    unread_count_user2 = CASE 
      WHEN v_conversation.user2_id != NEW.sender_id THEN unread_count_user2 + 1
      ELSE unread_count_user2
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

-- Create trigger for automatic conversation updates
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

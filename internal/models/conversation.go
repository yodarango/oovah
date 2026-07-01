package models

import (
	"database/sql"
	"fmt"
	"sort"
	"time"
)

// Message represents a single exchange within a conversation.
type Message struct {
	Id             int       `json:"id"`
	ConversationId int       `json:"conversation_id"`
	Role           string    `json:"role"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"created_at"`
}

// Conversation represents a translation or question thread.
type Conversation struct {
	Id          int       `json:"id"`
	UserId      int       `json:"user_id"`
	Type        string    `json:"type"`
	Source      string    `json:"source"`
	Target      string    `json:"target"`
	ResponseIn  string    `json:"response_in"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Messages    []Message `json:"messages"`
}

// CreateConversation inserts a new conversation and returns its ID.
func CreateConversation(userId int, conversationType, source, target, responseIn string) (int, error) {
	query := `
		INSERT INTO conversations (user_id, type, source, target, response_in)
		VALUES (?, ?, ?, ?, ?)
	`
	result, err := ModelsRepo.DB.Conn.Exec(query, userId, conversationType, source, target, responseIn)
	if err != nil {
		return 0, fmt.Errorf("could not create conversation: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("could not get conversation id: %w", err)
	}

	return int(id), nil
}

// AddMessage inserts a message into a conversation.
func AddMessage(conversationId int, role, content string) error {
	query := `
		INSERT INTO messages (conversation_id, role, content)
		VALUES (?, ?, ?)
	`
	_, err := ModelsRepo.DB.Conn.Exec(query, conversationId, role, content)
	if err != nil {
		return fmt.Errorf("could not add message: %w", err)
	}

	return nil
}

// GetConversationById retrieves a conversation and all its messages for a specific user.
func GetConversationById(id, userId int) (*Conversation, error) {
	query := `
		SELECT id, user_id, type, source, target, response_in, created_at, updated_at
		FROM conversations
		WHERE id = ? AND user_id = ?
	`
	row := ModelsRepo.DB.Conn.QueryRow(query, id, userId)

	var conversation Conversation
	err := row.Scan(
		&conversation.Id,
		&conversation.UserId,
		&conversation.Type,
		&conversation.Source,
		&conversation.Target,
		&conversation.ResponseIn,
		&conversation.CreatedAt,
		&conversation.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("conversation not found")
		}
		return nil, fmt.Errorf("could not get conversation: %w", err)
	}

	messagesQuery := `
		SELECT id, conversation_id, role, content, created_at
		FROM messages
		WHERE conversation_id = ?
		ORDER BY created_at ASC, id ASC
	`
	rows, err := ModelsRepo.DB.Conn.Query(messagesQuery, id)
	if err != nil {
		return nil, fmt.Errorf("could not get messages: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var message Message
		err := rows.Scan(
			&message.Id,
			&message.ConversationId,
			&message.Role,
			&message.Content,
			&message.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("could not scan message: %w", err)
		}
		conversation.Messages = append(conversation.Messages, message)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating messages: %w", err)
	}

	return &conversation, nil
}

// GetRecentMessagesByConversationId retrieves the most recent messages for each
// role in a conversation, merges them, and returns them in chronological order.
func GetRecentMessagesByConversationId(conversationId, userLimit, assistantLimit int) ([]Message, error) {
	fetchMessages := func(role string, limit int) ([]Message, error) {
		query := `
			SELECT id, conversation_id, role, content, created_at
			FROM messages
			WHERE conversation_id = ? AND role = ?
			ORDER BY created_at DESC, id DESC
			LIMIT ?
		`
		rows, err := ModelsRepo.DB.Conn.Query(query, conversationId, role, limit)
		if err != nil {
			return nil, fmt.Errorf("could not get %s messages: %w", role, err)
		}
		defer rows.Close()

		var messages []Message
		for rows.Next() {
			var message Message
			err := rows.Scan(
				&message.Id,
				&message.ConversationId,
				&message.Role,
				&message.Content,
				&message.CreatedAt,
			)
			if err != nil {
				return nil, fmt.Errorf("could not scan %s message: %w", role, err)
			}
			messages = append(messages, message)
		}

		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("error iterating %s messages: %w", role, err)
		}

		return messages, nil
	}

	userMessages, err := fetchMessages("user", userLimit)
	if err != nil {
		return nil, err
	}

	assistantMessages, err := fetchMessages("assistant", assistantLimit)
	if err != nil {
		return nil, err
	}

	messages := append(userMessages, assistantMessages...)
	sort.Slice(messages, func(i, j int) bool {
		if messages[i].CreatedAt.Equal(messages[j].CreatedAt) {
			return messages[i].Id < messages[j].Id
		}
		return messages[i].CreatedAt.Before(messages[j].CreatedAt)
	})

	return messages, nil
}

// GetMessagesByConversationId returns only the messages for a conversation.
// GetConversations retrieves a paginated list of conversations with message counts
// and the first user and assistant messages for preview, filtered by user.
func GetConversations(userId, limit, offset int) ([]struct {
	Conversation
	MessageCount          int    `json:"message_count"`
	FirstUserMessage      string `json:"first_user_message"`
	FirstAssistantMessage string `json:"first_assistant_message"`
}, int, error) {
	query := `
		SELECT c.id, c.user_id, c.type, c.source, c.target, c.response_in, c.created_at, c.updated_at,
			COUNT(m.id) AS message_count,
			(SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY created_at ASC, id ASC LIMIT 1) AS first_user_message,
			(SELECT content FROM messages WHERE conversation_id = c.id AND role = 'assistant' ORDER BY created_at ASC, id ASC LIMIT 1) AS first_assistant_message
		FROM conversations c
		LEFT JOIN messages m ON m.conversation_id = c.id
		WHERE c.user_id = ?
		GROUP BY c.id
		ORDER BY c.updated_at DESC, c.id DESC
		LIMIT ? OFFSET ?
	`
	rows, err := ModelsRepo.DB.Conn.Query(query, userId, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("could not get conversations: %w", err)
	}
	defer rows.Close()

	var conversations []struct {
		Conversation
		MessageCount          int    `json:"message_count"`
		FirstUserMessage      string `json:"first_user_message"`
		FirstAssistantMessage string `json:"first_assistant_message"`
	}
	for rows.Next() {
		var item struct {
			Conversation
			MessageCount          int    `json:"message_count"`
			FirstUserMessage      string `json:"first_user_message"`
			FirstAssistantMessage string `json:"first_assistant_message"`
		}
		err := rows.Scan(
			&item.Id,
			&item.UserId,
			&item.Type,
			&item.Source,
			&item.Target,
			&item.ResponseIn,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.MessageCount,
			&item.FirstUserMessage,
			&item.FirstAssistantMessage,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("could not scan conversation: %w", err)
		}
		conversations = append(conversations, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating conversations: %w", err)
	}

	var total int
	err = ModelsRepo.DB.Conn.QueryRow("SELECT COUNT(*) FROM conversations WHERE user_id = ?", userId).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("could not count conversations: %w", err)
	}

	return conversations, total, nil
}

// DeleteConversation removes a conversation and all of its messages for a specific user.
func DeleteConversation(id, userId int) error {
	_, err := ModelsRepo.DB.Conn.Exec(
		"DELETE FROM messages WHERE conversation_id = ? AND conversation_id IN (SELECT id FROM conversations WHERE id = ? AND user_id = ?)",
		id, id, userId,
	)
	if err != nil {
		return fmt.Errorf("could not delete messages: %w", err)
	}

	_, err = ModelsRepo.DB.Conn.Exec("DELETE FROM conversations WHERE id = ? AND user_id = ?", id, userId)
	if err != nil {
		return fmt.Errorf("could not delete conversation: %w", err)
	}

	return nil
}

func GetMessagesByConversationId(id int) ([]Message, error) {
	query := `
		SELECT id, conversation_id, role, content, created_at
		FROM messages
		WHERE conversation_id = ?
		ORDER BY created_at ASC, id ASC
	`
	rows, err := ModelsRepo.DB.Conn.Query(query, id)
	if err != nil {
		return nil, fmt.Errorf("could not get messages: %w", err)
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var message Message
		err := rows.Scan(
			&message.Id,
			&message.ConversationId,
			&message.Role,
			&message.Content,
			&message.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("could not scan message: %w", err)
		}
		messages = append(messages, message)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating messages: %w", err)
	}

	return messages, nil
}

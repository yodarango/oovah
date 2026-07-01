package models

import (
	"encoding/json"
	"fmt"
	"io"
	"oovah/internal/lib"
)

// Translation holds the input for a translate/question request.
type Translation struct {
	Source         string `json:"source"`
	Target         string `json:"target"`
	Text           string `json:"text"`
	ResponseIn     string `json:"responseIn"`
	IsQuestion     bool   `json:"isQuestion"`
	ConversationId int    `json:"conversationId"`
}

// RequestToStruct decodes the request body into the Translation struct.
func (t *Translation) RequestToStruct(body io.ReadCloser) error {
	bodyBuffer, err := io.ReadAll(body)
	if err != nil {
		return fmt.Errorf("error reading body data: %w", err)
	}
	body.Close()

	err = json.Unmarshal(bodyBuffer, &t)
	if err != nil {
		return fmt.Errorf("error unmarshalling body data: %w", err)
	}

	return nil
}

// Validate checks that the request has the required fields.
func (t *Translation) Validate() error {
	if t.Text == "" {
		return fmt.Errorf("text is required")
	}
	if !t.IsQuestion && (t.Source == "" || t.Target == "") {
		return fmt.Errorf("source and target are required for translations")
	}
	return nil
}

// Translate sends the text to OpenAI, persists the conversation, and returns
// the generated response along with the conversation id.
func (t *Translation) Translate(userId int) (string, int, error) {
	if err := t.Validate(); err != nil {
		return "", 0, err
	}

	conversationType := "translation"
	if t.IsQuestion {
		conversationType = "question"
	}

	var conversationId int
	var previousMessages []Message
	var err error

	if t.ConversationId > 0 {
		conversation, err := GetConversationById(t.ConversationId, userId)
		if err != nil {
			return "", 0, err
		}
		conversationId = conversation.Id
		previousMessages, err = GetRecentMessagesByConversationId(conversationId, 5, 5)
		if err != nil {
			return "", 0, err
		}
	} else {
		conversationId, err = CreateConversation(userId, conversationType, t.Source, t.Target, t.ResponseIn)
		if err != nil {
			return "", 0, err
		}
	}

	err = AddMessage(conversationId, "user", t.Text)
	if err != nil {
		return "", 0, err
	}

	service := lib.NewTranslationService()

	var libMessages []lib.Message
	for _, message := range previousMessages {
		libMessages = append(libMessages, lib.Message{
			Role:    message.Role,
			Content: message.Content,
		})
	}

	isContinuingConversation := t.ConversationId > 0 && len(previousMessages) > 0

	translation, err := service.Translate(
		t.Source,
		t.Target,
		t.Text,
		t.ResponseIn,
		t.IsQuestion,
		libMessages,
		isContinuingConversation,
	)
	if err != nil {
		return "", 0, err
	}

	err = AddMessage(conversationId, "assistant", translation)
	if err != nil {
		return "", 0, err
	}

	return translation, conversationId, nil
}

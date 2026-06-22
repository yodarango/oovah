package lib

import (
	"context"
	"fmt"
	"os"

	"github.com/sashabaranov/go-openai"
)

type TranslationService struct {
	client *openai.Client
}

func NewTranslationService() *TranslationService {
	apiKey := os.Getenv("OPEN_AI")
	return &TranslationService{
		client: openai.NewClient(apiKey),
	}
}

// Translate sends text to OpenAI and returns the translated version.
func (t *TranslationService) Translate(sourceLang, targetLang, text string) (string, error) {
	if t.client == nil {
		return "", fmt.Errorf("OPEN_AI is not configured")
	}

	prompt := fmt.Sprintf("Translate the following text from %s to %s. Only return the translated text, nothing else:\n\n%s", sourceLang, targetLang, text)

	resp, err := t.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT4oMini,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: "You are a professional translator.",
				},
				{
					Role:    openai.ChatMessageRoleUser,
					Content: prompt,
				},
			},
		},
	)
	if err != nil {
		return "", fmt.Errorf("translation failed: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no translation returned")
	}

	return resp.Choices[0].Message.Content, nil
}

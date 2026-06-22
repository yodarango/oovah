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
func (t *TranslationService) Translate(sourceLang, targetLang, text, instructions string) (string, error) {
	if t.client == nil {
		return "", fmt.Errorf("OPEN_AI is not configured")
	}

	prompt := fmt.Sprintf("Your job :\n\n%s", sourceLang, targetLang, text)

	if instructions != "" {
		prompt = fmt.Sprintf("Translate the following text from %s to %s.\n\nAdditional instructions: %s\n\nText to translate:\n%s", sourceLang, targetLang, instructions, text)
	}

	resp, err := t.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT4oMini,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: fmt.Sprintf("Your job is to translate as accurately as possible the text sent by the user in %s to %s. In the first sentence translate %s but in a very consice text block below explain any nuances of %s and provide examlpes of how to use them in a daily basis. Make sure the response is always plain text and never include other text that does not have to do with the translation, like offering further help or such. If the Target language is Spanish, always use the mexican dialect. For all others use the most standard version of it.", sourceLang, targetLang, text, targetLang),
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

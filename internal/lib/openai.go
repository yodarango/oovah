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
func (t *TranslationService) Translate(sourceLang, targetLang, text, responseIn string, isQuestion bool) (string, error) {
	if t.client == nil {
		return "", fmt.Errorf("OPEN_AI is not configured")
	}

	responseLang := responseIn
	if responseLang == "" {
		responseLang = targetLang
	}

	prompt := fmt.Sprintf("Translate the following text from %s to %s:\n\n%s", sourceLang, targetLang, text)
	if isQuestion {
		prompt = fmt.Sprintf("The user has a question about the following text from %s to %s. Answer the question in detail and use the translation as part of your answer when relevant.\n\n%s", sourceLang, targetLang, text)
	}

	var systemPrompt string
	if isQuestion {
		systemPrompt = fmt.Sprintf(`
		You are a helpful language assistant. The user is asking a question related to a text in %s and expects an answer in %s.
		Write your entire response in %s.
		Provide a detailed, helpful answer that addresses the question directly. You may include a translation or explanation of the original text when relevant.
		Make sure the response is always plain text and never include unrelated text like offering further help or speaking directly to the user unless necessary.
		If the target language is Spanish, always use the mexican dialect. If it is Greek, use Koine Greek. Never modern Greek. For all others use the most standard version of it.`, sourceLang, targetLang, responseLang)
	} else {
		systemPrompt = fmt.Sprintf(`
		Your job is to translate as accurately as possible the text sent by the user from %s to %s.
		Write your entire response in %s.
		Respond with the translation only. Do not add explanations, examples, notes, or any other text.
		Make sure the response is always plain text and never include other text that does not have to do with the translation, like offering further help or speaking directly to the user.
		If the target language is Spanish, always use the mexican dialect. If it is Greek, use Koine Greek. Never modern Greek. For all others use the most standard version of it.`, sourceLang, targetLang, responseLang)
	}

	resp, err := t.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT4oMini,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: systemPrompt,
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

package lib

import (
	"context"
	"fmt"
	"os"

	"github.com/sashabaranov/go-openai"
)

// Message represents a single message in a conversation.
type Message struct {
	Role    string
	Content string
}

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
// Previous messages can be provided to maintain conversation context.
func (t *TranslationService) Translate(sourceLang, targetLang, text, responseIn string, isQuestion bool, previousMessages []Message) (string, error) {
	if t.client == nil {
		return "", fmt.Errorf("OPEN_AI is not configured")
	}

	responseLang := responseIn

	if responseLang == "" {
		responseLang = targetLang
	}

	if responseLang == "" {
		responseLang = "Italian"
	}

	var prompt string

	if isQuestion {
		prompt = fmt.Sprintf(`
		In have the following question about the %s language that I need help with.
		Respond as concisely as possible but without ommitting too much details.
		I am interested in how this text is used in every day contexts and any nuances they might need to know about. Following is my question: \n\n%s`, sourceLang, text)
	} else {
		prompt = fmt.Sprintf("Translate the following text from %s to %s:\n\n%s. Make sure to respond in %s", sourceLang, targetLang, text, responseIn)
	}

	prompt = fmt.Sprintf("%s \n\n Make sure you respect the json format instructed in the system requirements.", prompt)

	var systemPrompt string

	if isQuestion {
		systemPrompt = fmt.Sprintf(`
		You are a helpful language assistant. The user is asking about the %s alanguge but they expect the response in %s.
		They are learning %s so please make sure to priovide examples and details that will help them better understand this question but without being too verbose.
		It is possible that the user finds themselves infront of a receptionist at hotel or in a means of transportation and they need a consice answer that they can skim through quickly.
		If the user has typed the request in any language other than Spanish or English, inspect the text for grammar or syntax errors and resond with the corrections after you have answered the request.
		If the user has typed the request in any language other than Spanish, know that that is not their native tongue and they are students of it.
		Feel free to make the response and the corrections in the json object markdown text to emphasize important elements.
		`, sourceLang, responseLang, sourceLang)

		systemPrompt = fmt.Sprintf("%s \n\n The following instructions are critical. Make sure that you respect them. The response must be in the followng json format: "+
			"{response: <translation>, has_corrections: <boolean>, corrections: <string>}", systemPrompt)

	} else {
		systemPrompt = fmt.Sprintf(`
		Your job is to translate as accurately as possible the text sent by the user from %s to %s.
		Write your entire response in %s.
		Respond with the translation only. Do not add explanations, examples, notes, or any other text.
		Make sure that your response is always in plain text and never include other text that does not have to do with the translation, like offering further help or speaking directly to the user.`, sourceLang, targetLang, responseLang)

		if targetLang == "Spanish" {
			systemPrompt = fmt.Sprintf("%s \n Use the mexican dialect. If %s is Greek, use Koine Greek. Never modern Greek. For all others use the most standard version of it.", systemPrompt)
		}

		if targetLang == "Greek" {
			systemPrompt = fmt.Sprintf("%s \n Use the Koine Greek. Do not use modern Greek.", systemPrompt)
		}
	}

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		},
	}

	for _, message := range previousMessages {
		role := openai.ChatMessageRoleUser
		if message.Role == "assistant" {
			role = openai.ChatMessageRoleAssistant
		}
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    role,
			Content: message.Content,
		})
	}

	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: prompt,
	})

	resp, err := t.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model:    openai.GPT4oMini,
			Messages: messages,
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

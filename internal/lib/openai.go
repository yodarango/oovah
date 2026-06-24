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


	if responseIn == "" {
		responseIn = targetLang
	}

	if responseIn == "" {
		responseIn = "Italian"
	}

	var prompt string

	if isQuestion {
		prompt = fmt.Sprintf(`
		In have the following question about the %s language that I need help with.
		Make sure to respond in %s.
		Respond as concisely as possible but without ommitting too much details.
		I am interested in how this text is used in every day contexts and any nuances they might need to know about. Following is my question: %s`, sourceLang, responseIn, text)
	} else {
		prompt = fmt.Sprintf("Translate the following text from %s to %s:\n\n%s. Make sure to respond in %s. \n\n Do not tell me anything else other than the translation.", sourceLang, targetLang, text, responseIn)
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
		The following instructions are critical. Make sure that you respect them. The response must be in the followng json format: "
		"{response: <translation>, has_corrections: <boolean>, corrections: <string>}. Feel free to make the response and the corrections in the json object markdown text to emphasize important elements.
		`, sourceLang, responseIn, sourceLang)

	} else {
		systemPrompt = fmt.Sprintf(`
		Your job is to translate as accurately as possible the text sent by the user from %s to %s.
		Respond with the translation only. Do not add explanations, examples, notes, or any other text.
		Make sure that your response is always in plain text and never include other text that does not have to do with the translation, like offering further help or speaking directly to the user.
		If the word has more than more than one meaning, then provide them separated by comme in the order of frequency.`, sourceLang, targetLang)

		if targetLang == "Spanish" {
			systemPrompt = fmt.Sprintf("%s \n Use the mexican dialect. ", systemPrompt)
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

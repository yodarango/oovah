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


var learningLanguages = []string{"italian", "german", "dutch", "greek"}

// Translate sends text to OpenAI and returns the translated version.
func (t *TranslationService) Translate(sourceLang, targetLang, text, responseIn string, isQuestion bool) (string, error) {
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

	prompt := fmt.Sprintf("Translate the following text from %s to %s:\n\n%s. Make sure to respond in %s", sourceLang, targetLang, text, responseIn)
	if isQuestion {

		isLearnignLang := false

		for _, lang := range learningLanguages {
			if sourceLang == lang {
				isLearnignLang = true
			}
		}
		prompt = fmt.Sprintf(`
		The user has written the following text in %s. 
		It may be a question or a sentence they need help with. 
		Respond as concisely as possible but without ommitting too much details. 
		They are interested in how this text is used in every day contexts and any nuances they might need to know about. \n\n%s`, sourceLang, text)


		if isLearnignLang {
			fmt.Sprintf(`The user is a stiudent of %s, therefore, they might have grammer or syntax issues. Please correct their mistakes consicely before explaining the question in the first paragraph.`)
		}

		prompt = fmt.Sprintf(`\n\n Do not forget to respond in %s`, responseIn)
	}

	var systemPrompt string
	if isQuestion {
		systemPrompt = fmt.Sprintf(`
		You are a helpful language assistant. The user is asking about text written in %s. They expect the response in %s.
		Follow these steps in your answer, all written in %s:
		1. If %s is NOT English and NOT Spanish, provide grammar corrections to the user's text to help them improve. Explain why each correction is needed.
		2. Provide a clear, accurate translation of the text into %s.
		3. Above the translation, explain the translation and answer any question the user may have asked.
		Make sure the response is always plain text and never include unrelated text like offering further help or speaking directly to the user unless necessary.
		If %s is Spanish, always use the mexican dialect. If %s is Greek, use Koine Greek. Never modern Greek. For all others use the most standard version of it.`, sourceLang, responseLang, responseLang, sourceLang, responseLang, responseLang, responseLang)
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

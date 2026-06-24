package lib

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"

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

type questionResponse struct {
	Response     string `json:"response"`
	HasCorrections bool   `json:"has_corrections"`
	Corrections  string `json:"corrections"`
}

// NormalizeQuestionResponse takes a raw assistant response and returns a valid
// JSON string in the expected {response, has_corrections, corrections} shape.
// It handles markdown code fences, standard JSON, non-standard object literals,
// and plain text.
func NormalizeQuestionResponse(raw string) string {
	cleaned := strings.TrimSpace(raw)

	// Strip markdown code fences (```json ... ```)
	cleaned = regexp.MustCompile("(?s)^```(?:json)?\\s*").ReplaceAllString(cleaned, "")
	cleaned = regexp.MustCompile("(?s)\\s*```$").ReplaceAllString(cleaned, "")
	cleaned = strings.TrimSpace(cleaned)

	var parsed questionResponse

	// Try standard JSON
	if err := json.Unmarshal([]byte(cleaned), &parsed); err == nil {
		out, _ := json.Marshal(parsed)
		return string(out)
	}

	// Try non-standard object literal: {response: "...", has_corrections: true|false, corrections: "..."}
	literalRegex := regexp.MustCompile(`^\s*\{\s*response\s*:\s*("(?:\\.|[^"\\])*")\s*,\s*has_corrections\s*:\s*(true|false)\s*,\s*corrections\s*:\s*("(?:\\.|[^"\\])*")\s*\}\s*$`)
	if match := literalRegex.FindStringSubmatch(cleaned); match != nil {
		parseString := func(s string) string {
			if unquoted, err := strconv.Unquote(s); err == nil {
				return unquoted
			}
			// Fallback: strip surrounding quotes and unescape
			s = strings.TrimPrefix(s, "\"")
			s = strings.TrimSuffix(s, "\"")
			return strings.ReplaceAll(s, `\\"`, `"`)
		}
		parsed = questionResponse{
			Response:     parseString(match[1]),
			HasCorrections: match[2] == "true",
			Corrections:  parseString(match[3]),
		}
		out, _ := json.Marshal(parsed)
		return string(out)
	}

	// Fallback: treat the entire raw response as the answer with no corrections
	parsed = questionResponse{
		Response:     cleaned,
		HasCorrections: false,
		Corrections:  "",
	}
	out, _ := json.Marshal(parsed)
	return string(out)
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
		I have the following question about the %s language that I need help with.
		Make sure to respond in %s.
		Respond as concisely as possible but without ommitting too much details.
		I am interested in how this text is used in every day contexts and any nuances they might need to know about. Following is my question: %s.
		Make sure you respect the json format instructed in the system requirements.`, sourceLang, responseIn, text)
	} else {
		prompt = text
	}

	var systemPrompt string

	if isQuestion {
		systemPrompt = fmt.Sprintf(`
		You are a helpful language assistant. The user is asking about the %s language but they expect the response in %s.
		They are learning %s so please make sure to provide examples and details that will help them better understand this question but without being too verbose.
		It is possible that the user finds themselves in front of a receptionist at a hotel or in a means of transportation and they need a concise answer that they can skim through quickly.
		If the user has typed the request in any language other than Spanish or English, inspect the text for grammar or syntax errors and respond with the corrections after you have answered the request.
		If the user has typed the request in any language other than Spanish or English, know that that is not their native tongue and they are students of it.
		Do not provide corrections for requests that are written in English nor Spanish.
		The following instructions are critical. You must always respond with a single valid JSON object and nothing else. The JSON must use this exact structure:
		{"response": "<answer to the question>", "has_corrections": <true or false>, "corrections": "<corrections or empty string>"}
		Do not wrap the JSON in markdown code blocks, do not add any explanation text before or after the JSON, and do not use any other format.
		`, sourceLang, responseIn, sourceLang)

	} else {
		systemPrompt = fmt.Sprintf(`
		Your job is to translate as accurately as possible the text sent by the user from %s to %s.
		Respond with the translation only. Do not add explanations, examples, notes, or any other text.
		Make sure that your response is always in plain text and never include other text that does not have to do with the translation, like offering further help or speaking directly to the user.
		If the word has more than more than one meaning, then provide the other meanings separated by comme in the order of frequency.`, sourceLang, targetLang)

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

	content := resp.Choices[0].Message.Content
	if isQuestion {
		content = NormalizeQuestionResponse(content)
	}

	return content, nil
}

package lib

import "testing"

func TestParseGrammarAnalysis(t *testing.T) {
	tests := []struct {
		name, raw, source, target string
		wantError                 bool
	}{
		{"preserves punctuation and spaces", `{"source":[{"text":"hello","tag":"Interj."},{"text":"! ","tag":""}],"target":[{"text":"hola","tag":"Interj."}]}`, "hello! ", "hola", false},
		{"rejects rewritten text", `{"source":[{"text":"Hello","tag":"N."}],"target":[{"text":"hola","tag":""}]}`, "hello", "hola", true},
		{"rejects missing target", `{"source":[{"text":"hello","tag":""}]}`, "hello", "hola", true},
		{"rejects invalid json", `not json`, "hello", "hola", true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := parseGrammarAnalysis(test.raw, test.source, test.target)
			if (err != nil) != test.wantError {
				t.Fatalf("error = %v, want error %v", err, test.wantError)
			}
		})
	}
}

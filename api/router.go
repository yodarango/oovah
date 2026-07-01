package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"oovah/constants"
	"oovah/internal/models"
	"oovah/internal/utils"
	"os"
	"strconv"
	"strings"
)

func Router () http.Handler {

	mux := http.NewServeMux()

	mux.HandleFunc(constants.ROUTE_GET_AUTH_SAMPLE, models.Authenticate(SampleAuth))
	mux.HandleFunc(constants.ROUTE_GET_PUBLIC_SAMPLE, SamplePub)

	// Public auth routes
	mux.HandleFunc(constants.ROUTE_POST_FORGOT_PASSWORD, ForgotPassword)
	mux.HandleFunc(constants.ROUTE_POST_VERIFY_EMAIL, VerifyEmail)
	mux.HandleFunc(constants.ROUTE_POST_SIGNUP, Signup)
	mux.HandleFunc(constants.ROUTE_POST_LOGIN, Login)

	// Protected routes
	mux.HandleFunc(constants.ROUTE_POST_CHANGE_PASSWORD, models.Authenticate(ChangePassword))
	mux.HandleFunc(constants.ROUTE_POST_UPDATE_PROFILE, models.Authenticate(UpdateProfile))
	mux.HandleFunc(constants.ROUTE_POST_TRANSLATE, models.Authenticate(Translate))
	mux.HandleFunc(constants.ROUTE_GET_CONVERSATION, models.Authenticate(ConversationHandler))
	mux.HandleFunc(constants.ROUTE_GET_CONVERSATIONS, models.Authenticate(GetConversations))

	// Serve static files from the frontend build
	staticPath := os.Getenv("STATIC_PATH")
	if staticPath == "" {
		staticPath = "web/dist"
	}
	spa := spaHandler{staticPath: staticPath, indexPath: "index.html"}
	mux.Handle("/", spa)

	return utils.EnableCORS(mux)
}

// getUserIdFromContext extracts the authenticated user ID from the request context.
func getUserIdFromContext(r *http.Request) int {
	user, ok := r.Context().Value(constants.USER_CONTEXT_AUTH_KEY).(*models.AuthUser)
	if !ok || user == nil {
		return 0
	}

	return int(user.Id)
}

// spaHandler implements the http.Handler interface for serving a SPA
type spaHandler struct {
	staticPath string
	indexPath  string
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := h.staticPath + r.URL.Path

	// Check if file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		// File does not exist, serve index.html
		http.ServeFile(w, r, h.staticPath+"/"+h.indexPath)
		return
	}

	// Serve the file
	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

/************************************************************************
* Simple Auth func
*********************************************************************/
func SampleAuth(w http.ResponseWriter, r *http.Request) {
	var httpResponse models.HttpResponse

	// Get authenticated user
	_, ok := r.Context().Value(constants.USER_CONTEXT_AUTH_KEY).(*models.AuthUser)
	if !ok {
		httpResponse.Error = "Authentication required"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	httpResponse.Data = map[string]interface{}{
		"message": "hello",
	}
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Simple Pub func
*********************************************************************/
func SamplePub(w http.ResponseWriter, r *http.Request) {
	var httpResponse models.HttpResponse

	
	httpResponse.Data = "Hello"
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Handles login
*
* status: ✅
************************************************************************/
func Login(w http.ResponseWriter, r *http.Request){
	var httpResponse models.HttpResponse
	var user models.User

	err := user.RequestToStruct(r.Body)

	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	token, err := user.Login()

	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	data := map[string]interface{}{
		"AuthToken": token,
		"User": user,
	}

	httpResponse.Data = data
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Handles signup
*
* status: ✅
************************************************************************/
func Signup(w http.ResponseWriter, r *http.Request){
	var httpResponse models.HttpResponse
	var user models.User

	err := user.RequestToStruct(r.Body)

	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	token, err := user.Signup()

	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	data := map[string]interface{}{
		"AuthToken": token,
		"User": user,
	}


	httpResponse.Success = false
	httpResponse.Data = data
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Handles email verification
* 
* status: ✅
************************************************************************/
func VerifyEmail(w http.ResponseWriter, r *http.Request){
	var httpResponse models.HttpResponse
	var user models.User

	// Create struct to receive the code
	var requestBody struct {
		Code string `json:"code"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		httpResponse.Error = "Invalid request format"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	if len(requestBody.Code) == 0 {
		httpResponse.Error = "verification code is required"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	token, err := user.VerifyEmail(requestBody.Code)

	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	data := map[string]interface{}{
		"AuthToken": token,
		"User": user,
	}

	httpResponse.Data = data
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Handles forgot password functionality by sending a temporary password
* to the user's email address. The user can then use this temporary 
* password to log in and change their password.
*
* status: ✅
************************************************************************/
func ForgotPassword(w http.ResponseWriter, r *http.Request){
	var httpResponse models.HttpResponse
	var user models.User

	err := user.ForgotPassword(r.Body)

	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	httpResponse.Data = map[string]string{
		"message": "Password reset email sent successfully",
	}
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Handles password change functionality. Requires authentication and
* current password verification before allowing the user to set a new password.
*
* status: ✅
************************************************************************/
func ChangePassword(w http.ResponseWriter, r *http.Request){
	var httpResponse models.HttpResponse
	var user models.User

	// Get authenticated user from context
	authUser, ok := r.Context().Value(constants.USER_CONTEXT_AUTH_KEY).(*models.AuthUser)
	if !ok {
		httpResponse.Error = "Authentication required"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	err := user.ChangePassword(r.Body, authUser.Id)

	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	httpResponse.Data = map[string]string{
		"message": "Password changed successfully",
	}
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Updates user profile (first name and last name)
* status: ✅
************************************************************************/
func UpdateProfile(w http.ResponseWriter, r *http.Request){
	var httpResponse models.HttpResponse
	var user models.User

	// Parse request body
	err := user.RequestToStruct(r.Body)
	if err != nil {
		httpResponse.Error = fmt.Sprintf("Invalid request data: %v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	// Get authenticated user from context
	authUser, ok := r.Context().Value(constants.USER_CONTEXT_AUTH_KEY).(*models.AuthUser)
	if !ok {
		httpResponse.Error = "Authentication required"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	// Call the Update method from the user model
	err = user.Update(authUser.Id)
	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	httpResponse.Data = map[string]string{
		"message": "Profile updated successfully",
	}
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Translates text from one language to another using OpenAI.
************************************************************************/
func Translate(w http.ResponseWriter, r *http.Request) {
	var httpResponse models.HttpResponse
	var translation models.Translation

	err := translation.RequestToStruct(r.Body)
	if err != nil {
		httpResponse.Error = "Invalid request format"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	userId := getUserIdFromContext(r)

	translatedText, conversationId, err := translation.Translate(userId)
	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	httpResponse.Data = map[string]interface{}{
		"translation":    translatedText,
		"conversationId": conversationId,
	}
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Dispatches GET and DELETE requests for a single conversation.
************************************************************************/
func ConversationHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodDelete:
		DeleteConversation(w, r)
	default:
		GetConversation(w, r)
	}
}

/************************************************************************
* Deletes a conversation and all of its messages by ID.
************************************************************************/
func DeleteConversation(w http.ResponseWriter, r *http.Request) {
	var httpResponse models.HttpResponse

	userId := getUserIdFromContext(r)

	idStr := strings.TrimPrefix(r.URL.Path, constants.ROUTE_DELETE_CONVERSATION)
	idStr = strings.TrimSpace(idStr)

	if idStr == "" {
		httpResponse.Error = "conversation id is required"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		httpResponse.Error = "invalid conversation id"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	err = models.DeleteConversation(id, userId)
	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	httpResponse.Data = map[string]string{"message": "conversation deleted"}
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Retrieves a conversation and its messages by ID.
************************************************************************/
func GetConversation(w http.ResponseWriter, r *http.Request) {
	var httpResponse models.HttpResponse

	userId := getUserIdFromContext(r)

	idStr := strings.TrimPrefix(r.URL.Path, constants.ROUTE_GET_CONVERSATION)
	idStr = strings.TrimSpace(idStr)

	if idStr == "" {
		httpResponse.Error = "conversation id is required"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		httpResponse.Error = "invalid conversation id"
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	conversation, err := models.GetConversationById(id, userId)
	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	httpResponse.Data = conversation
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

/************************************************************************
* Retrieves a paginated list of conversations with message counts.
************************************************************************/
func GetConversations(w http.ResponseWriter, r *http.Request) {
	var httpResponse models.HttpResponse

	userId := getUserIdFromContext(r)

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	offset := 0

	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetStr != "" {
		parsedOffset, err := strconv.Atoi(offsetStr)
		if err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	conversations, total, err := models.GetConversations(userId, limit, offset)
	if err != nil {
		httpResponse.Error = fmt.Sprintf("%v", err)
		httpResponse.Success = false
		httpResponse.Data = nil
		httpResponse.Send(w)
		return
	}

	httpResponse.Data = map[string]interface{}{
		"conversations": conversations,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	}
	httpResponse.Success = true
	httpResponse.Error = nil
	httpResponse.Send(w)
}

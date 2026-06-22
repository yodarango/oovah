package models

import (
	"oovah/repo"
)

var ModelsRepo *repo.AppRepo

func SetModelsConfig(ar *repo.AppRepo) {
	ModelsRepo = ar
}
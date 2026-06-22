package api

import "oovah/repo"

var RouterConfig *repo.AppRepo

func SetRouterConfig(ar * repo.AppRepo){
	RouterConfig = ar
}
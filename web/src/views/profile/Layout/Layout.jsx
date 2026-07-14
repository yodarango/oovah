import { useAppContext } from "../../context/appContextProvider";
import { Input, Button, Modal, Thumbnail, IfElse, AvatarPicker } from "@ds";
import React, { useState, useEffect } from "react";
import { API_POST_UPDATE_PROFILE } from "@constants";
import { usePost } from "@utils";
import { avatars } from "@images";

// styles
import "./Layout.css";

export const Layout = () => {
  const { showToast, setupAuth, state } = useAppContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const [formData, setFormData] = useState({
    confirmPassword: "",
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    avatar: "",
  });

  // prefill the form with the authenticated user's information
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      first_name: state.user.first_name || "",
      last_name: state.user.last_name || "",
      username: state.user.username || "",
      avatar: state.user.avatar || "",
    }));
  }, [state.user]);

  const { post, loading, error } = usePost({
    url: API_POST_UPDATE_PROFILE,
    callback: (data) => {
      if (!data || !data.AuthToken) return;

      localStorage.setItem("auth", data.AuthToken.replace("Bearer ", ""));
      setupAuth();

      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));

      showToast({
        message: "Profile updated successfully.",
        type: "success",
      });
    },
  });

  const handleInputChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAvatarSave = (avatarPath) => {
    setFormData((prev) => ({ ...prev, avatar: avatarPath }));
    setShowAvatarModal(false);
  };

  const chosenAvater =
    avatars.find((avatar) => avatar.pathName === formData.avatar) || {};

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      showToast({ type: "danger", message: "First name is required" });
      return false;
    }
    if (!formData.last_name.trim()) {
      showToast({ type: "danger", message: "Last name is required" });
      return false;
    }
    if (!formData.username.trim()) {
      showToast({ type: "danger", message: "Username is required" });
      return false;
    }
    if (formData.password && formData.password.length < 6) {
      showToast({
        type: "danger",
        message: "Password must be at least 6 characters long",
      });
      return false;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      showToast({ type: "danger", message: "Passwords do not match" });
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const { confirmPassword, password, ...rest } = formData;
    const payload = { ...rest };
    if (password) payload.password = password;

    post(payload);
  };

  useEffect(() => {
    if (error) {
      showToast({ type: "danger", message: error });
    }
  }, [error]);

  return (
    <div className='profile-layout-56yl'>
      <h1 className='profile-layout-56yl__title'>Your Profile</h1>

      <form onSubmit={handleSubmit}>
        <div className='d-flex flex-column align-items-center justify-content-center mb-4'>
          <div
            className='profile-layout-56yl__avatar d-flex align-items-center justify-content-center flex-shrink-0'
            onClick={() => setShowAvatarModal(true)}
          >
            <IfElse condition={chosenAvater.image}>
              <Thumbnail
                alt={`Selected avatar: ${chosenAvater.name}`}
                src={chosenAvater.image}
                width='100%'
              />
              <ion-icon name='person-circle-outline'></ion-icon>
            </IfElse>
          </div>
          {/* <Button
            onClick={() => setShowAvatarModal(true)}
            className='mt-4'
            type='button'
            secondary
          >
            Change avatar
          </Button> */}
        </div>

        <div className='profile-layout-56yl__field'>
          <label htmlFor='email'>Email (cannot be changed)</label>
          <Input
            value={state.user.email || ""}
            id='email'
            type='email'
            disabled
          />
        </div>

        <div className='profile-layout-56yl__field'>
          <label htmlFor='username'>Username</label>
          <Input
            onChange={handleInputChange("username")}
            value={formData.username}
            placeholder='Choose a username'
            id='username'
            type='text'
            required
          />
        </div>

        <div className='profile-layout-56yl__row profile-layout-56yl__row--2-col'>
          <div className='profile-layout-56yl__field'>
            <label htmlFor='first_name'>First Name</label>
            <Input
              onChange={handleInputChange("first_name")}
              value={formData.first_name}
              placeholder='First name'
              id='first_name'
              type='text'
              required
            />
          </div>
          <div className='profile-layout-56yl__field'>
            <label htmlFor='last_name'>Last Name</label>
            <Input
              onChange={handleInputChange("last_name")}
              value={formData.last_name}
              placeholder='Last name'
              id='last_name'
              type='text'
              required
            />
          </div>
        </div>

        <div className='profile-layout-56yl__row profile-layout-56yl__row--2-col'>
          <div className='profile-layout-56yl__field'>
            <label htmlFor='password'>New Password</label>
            <div className='profile-layout-56yl__input-wrapper'>
              <Input
                onChange={handleInputChange("password")}
                value={formData.password}
                placeholder='New password'
                type={showPassword ? "text" : "password"}
                id='password'
                className='profile-layout-56yl__input--with-icon'
              />
              <button
                type='button'
                className='profile-layout-56yl__password-toggle'
                onClick={() => setShowPassword(!showPassword)}
              >
                <ion-icon
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                ></ion-icon>
              </button>
            </div>
          </div>
          <div className='profile-layout-56yl__field'>
            <label htmlFor='confirmPassword'>Confirm Password</label>
            <div className='profile-layout-56yl__input-wrapper'>
              <Input
                onChange={handleInputChange("confirmPassword")}
                value={formData.confirmPassword}
                placeholder='Confirm new password'
                type={showPassword ? "text" : "password"}
                id='confirmPassword'
                className='profile-layout-56yl__input--with-icon'
              />
              <button
                type='button'
                className='profile-layout-56yl__password-toggle'
                onClick={() => setShowPassword(!showPassword)}
              >
                <ion-icon
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                ></ion-icon>
              </button>
            </div>
          </div>
        </div>

        <Button
          type='submit'
          default
          isLoading={loading}
          className='w-100 mt-4'
        >
          Save Changes
        </Button>
      </form>

      <Modal
        onClose={() => setShowAvatarModal(false)}
        title='Choose Your Avatar'
        open={showAvatarModal}
        showWaves={false}
      >
        <AvatarPicker onSave={handleAvatarSave} isLoading={loading} />
      </Modal>
    </div>
  );
};

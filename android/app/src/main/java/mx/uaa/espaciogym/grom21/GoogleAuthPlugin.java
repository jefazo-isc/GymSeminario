package mx.uaa.espaciogym.grom21;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {

    private String getServerClientId(PluginCall call) {
        if (call != null && call.hasOption("serverClientId")) {
            String callClientId = call.getString("serverClientId");
            if (callClientId != null && !callClientId.trim().isEmpty()) {
                return callClientId.trim();
            }
        }
        String configClientId = getConfig().getString("serverClientId");
        if (configClientId != null && !configClientId.trim().isEmpty()) {
            return configClientId.trim();
        }
        configClientId = getConfig().getString("clientId");
        if (configClientId != null && !configClientId.trim().isEmpty()) {
            return configClientId.trim();
        }
        try {
            int resId = getContext().getResources().getIdentifier("server_client_id", "string", getContext().getPackageName());
            if (resId != 0) {
                String resValue = getContext().getString(resId);
                if (resValue != null && !resValue.trim().isEmpty()) {
                    return resValue.trim();
                }
            }
        } catch (Exception ignored) {}
        return "284503632870-hup11ff07or46r457spa5bj42nr26rdt.apps.googleusercontent.com";
    }

    private GoogleSignInOptions buildSignInOptions(PluginCall call) {
        String serverClientId = getServerClientId(call);
        return new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestIdToken(serverClientId)
            .build();
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        try {
            GoogleSignInOptions gso = buildSignInOptions(call);
            GoogleSignInClient client = GoogleSignIn.getClient(getContext(), gso);

            // Limpia sesión previa para garantizar que aparezca el selector nativo de cuentas
            client.signOut().addOnCompleteListener(getActivity(), task -> {
                Intent signInIntent = client.getSignInIntent();
                startActivityForResult(call, signInIntent, "googleSignInResult");
            });
        } catch (Exception e) {
            call.reject("Failed to initiate Google sign in: " + e.getMessage(), e);
        }
    }

    @ActivityCallback
    public void googleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        Intent data = result.getData();
        if (data == null) {
            call.reject("Google sign in cancelled", "12501");
            return;
        }

        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            if (account == null) {
                call.reject("Google sign in returned empty account", "12500");
                return;
            }

            JSObject user = new JSObject();
            user.put("idToken", account.getIdToken());
            user.put("serverAuthCode", account.getServerAuthCode());
            user.put("email", account.getEmail());
            user.put("displayName", account.getDisplayName());
            user.put("givenName", account.getGivenName());
            user.put("familyName", account.getFamilyName());
            user.put("id", account.getId());
            if (account.getPhotoUrl() != null) {
                user.put("imageUrl", account.getPhotoUrl().toString());
            }

            JSObject authentication = new JSObject();
            authentication.put("idToken", account.getIdToken());
            authentication.put("accessToken", "");
            user.put("authentication", authentication);

            call.resolve(user);
        } catch (ApiException e) {
            int code = e.getStatusCode();
            String status = GoogleSignInStatusCodes.getStatusCodeString(code);
            call.reject("Google sign in error (" + code + "): " + status, String.valueOf(code), e);
        } catch (Exception e) {
            call.reject("Google sign in failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        try {
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN).build();
            GoogleSignInClient client = GoogleSignIn.getClient(getContext(), gso);
            client.signOut().addOnCompleteListener(getActivity(), task -> {
                call.resolve();
            });
        } catch (Exception e) {
            call.reject("Error signing out of Google: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void refresh(PluginCall call) {
        try {
            GoogleSignInOptions gso = buildSignInOptions(call);
            GoogleSignInClient client = GoogleSignIn.getClient(getContext(), gso);
            Task<GoogleSignInAccount> task = client.silentSignIn();
            task.addOnCompleteListener(getActivity(), completedTask -> {
                try {
                    GoogleSignInAccount account = completedTask.getResult(ApiException.class);
                    JSObject auth = new JSObject();
                    auth.put("idToken", account.getIdToken());
                    call.resolve(auth);
                } catch (ApiException e) {
                    call.reject("Silent sign in failed: " + e.getMessage(), String.valueOf(e.getStatusCode()), e);
                }
            });
        } catch (Exception e) {
            call.reject("Error refreshing Google token: " + e.getMessage(), e);
        }
    }
}

#include <jni.h>

#include <cctype>
#include <algorithm>
#include <mutex>
#include <string>
#include <unordered_map>

namespace {
struct TabMetadata {
  std::string url;
  std::string title;
};

std::mutex g_state_mutex;
std::unordered_map<std::string, TabMetadata> g_tabs;
std::string g_active_tab_id;

std::string readStringField(const std::string& json, const std::string& key) {
  const std::string marker = "\"" + key + "\"";
  size_t cursor = json.find(marker);
  if (cursor == std::string::npos) return {};
  cursor = json.find(':', cursor + marker.size());
  if (cursor == std::string::npos) return {};
  ++cursor;
  while (cursor < json.size() && std::isspace(static_cast<unsigned char>(json[cursor]))) ++cursor;
  if (cursor >= json.size() || json[cursor] != '"') return {};
  ++cursor;

  std::string value;
  while (cursor < json.size()) {
    const char ch = json[cursor++];
    if (ch == '"') break;
    if (ch != '\\' || cursor >= json.size()) {
      value.push_back(ch);
      continue;
    }
    const char escaped = json[cursor++];
    switch (escaped) {
      case '"': value.push_back('"'); break;
      case '\\': value.push_back('\\'); break;
      case '/': value.push_back('/'); break;
      case 'n': value.push_back('\n'); break;
      case 'r': value.push_back('\r'); break;
      case 't': value.push_back('\t'); break;
      case 'b': value.push_back('\b'); break;
      case 'f': value.push_back('\f'); break;
      // Keep escaped Unicode intact for identifiers/URLs; Java parses the full
      // original payload for prompt text and other Unicode-bearing fields.
      case 'u':
        value.append("\\u");
        for (int i = 0; i < 4 && cursor < json.size(); ++i) value.push_back(json[cursor++]);
        break;
      default: value.push_back(escaped); break;
    }
  }
  return value;
}

std::string jsonEscape(const std::string& value) {
  std::string escaped;
  for (char ch : value) {
    switch (ch) {
      case '"': escaped += "\\\""; break;
      case '\\': escaped += "\\\\"; break;
      case '\n': escaped += "\\n"; break;
      case '\r': escaped += "\\r"; break;
      case '\t': escaped += "\\t"; break;
      default: escaped.push_back(ch); break;
    }
  }
  return escaped;
}

bool isOrSubdomain(const std::string& host, const std::string& domain) {
  return host == domain || (host.size() > domain.size()
      && host.compare(host.size() - domain.size(), domain.size(), domain) == 0
      && host[host.size() - domain.size() - 1] == '.');
}

bool supportsPromptHost(const std::string& url) {
  const size_t scheme_end = url.find("://");
  if (scheme_end == std::string::npos) return false;
  const size_t host_start = scheme_end + 3;
  const size_t host_end = url.find_first_of("/:?#", host_start);
  std::string host = url.substr(host_start, host_end == std::string::npos
      ? std::string::npos : host_end - host_start);
  std::transform(host.begin(), host.end(), host.begin(), [](unsigned char ch) {
    return static_cast<char>(std::tolower(ch));
  });
  if (host.rfind("www.", 0) == 0) host.erase(0, 4);
  return isOrSubdomain(host, "gemini.google.com")
      || isOrSubdomain(host, "deepseek.com")
      || isOrSubdomain(host, "chatgpt.com")
      || isOrSubdomain(host, "openai.com")
      || isOrSubdomain(host, "claude.ai");
}

jstring javaString(JNIEnv* env, const std::string& value) {
  return env->NewStringUTF(value.c_str());
}
}  // namespace

extern "C" JNIEXPORT jstring JNICALL
Java_com_himanshu_browserapp_MainActivity_nativeDispatchPayload(
    JNIEnv* env,
    jobject activity,
    jstring json_payload) {
  std::string payload;
  if (json_payload != nullptr) {
    const char* chars = env->GetStringUTFChars(json_payload, nullptr);
    if (chars != nullptr) {
      payload.assign(chars);
      env->ReleaseStringUTFChars(json_payload, chars);
    }
  }

  std::string action = readStringField(payload, "action");
  if (action.empty()) action = readStringField(payload, "command");
  if (action == "INJECT_DOM_PROMPT") action = "INJECT_PROMPT";
  const std::string tab_id = readStringField(payload, "tabId");
  const std::string url = readStringField(payload, "url");
  const std::string title = readStringField(payload, "title");

  bool known_action = false;
  {
    std::lock_guard<std::mutex> lock(g_state_mutex);
    if (action == "CREATE_TAB") {
      known_action = !tab_id.empty() && !url.empty();
      if (known_action) g_tabs[tab_id] = {url, title};
    } else if (action == "SWITCH_TAB") {
      known_action = g_tabs.find(tab_id) != g_tabs.end();
      if (known_action) g_active_tab_id = tab_id;
    } else if (action == "RELOAD_TAB" || action == "UPDATE_TAB") {
      const auto found = g_tabs.find(tab_id.empty() ? g_active_tab_id : tab_id);
      known_action = found != g_tabs.end();
      if (known_action && action == "UPDATE_TAB") {
        if (!url.empty()) found->second.url = url;
        if (!title.empty()) found->second.title = title;
      }
    } else if (action == "CLOSE_TAB") {
      const std::string closing_id = tab_id.empty() ? g_active_tab_id : tab_id;
      known_action = g_tabs.erase(closing_id) > 0;
      if (g_active_tab_id == closing_id) g_active_tab_id.clear();
    } else if (action == "INJECT_PROMPT") {
      const std::string target_id = tab_id.empty() ? g_active_tab_id : tab_id;
      const auto found = g_tabs.find(target_id);
      known_action = found != g_tabs.end() && supportsPromptHost(found->second.url);
    }
  }

  jclass activity_class = env->GetObjectClass(activity);
  jmethodID handler = env->GetMethodID(activity_class, "handleNativeCommand",
      "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Z");
  bool handled = false;
  if (known_action && handler != nullptr) {
    jstring java_action = javaString(env, action);
    jstring java_tab_id = javaString(env, tab_id);
    jstring java_url = javaString(env, url);
    jstring java_title = javaString(env, title);
    jstring java_payload = javaString(env, payload);
    handled = env->CallBooleanMethod(activity, handler, java_action, java_tab_id,
        java_url, java_title, java_payload) == JNI_TRUE;
    env->DeleteLocalRef(java_action);
    env->DeleteLocalRef(java_tab_id);
    env->DeleteLocalRef(java_url);
    env->DeleteLocalRef(java_title);
    env->DeleteLocalRef(java_payload);
    if (env->ExceptionCheck()) {
      env->ExceptionClear();
      handled = false;
    }
  }
  env->DeleteLocalRef(activity_class);

  const std::string response = "{\"accepted\":" + std::string(handled ? "true" : "false")
      + ",\"native\":true,\"action\":\"" + jsonEscape(action)
      + "\",\"tabId\":\"" + jsonEscape(tab_id) + "\"}";
  return javaString(env, response);
}

window.rewardSchoolApi = {
  async reviewWriting({ question, essay, sourceId }) {
    const config = window.rewardSchoolAiConfig || {};
    if (!config.writingReviewEndpoint) {
      throw new Error("Writing review API endpoint is missing.");
    }

    const endpoint = config.writingReviewEndpoint;
    window.rewardSchoolApi.lastEndpoint = endpoint;

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          essay,
          sourceId,
        }),
      });
    } catch (error) {
      throw new Error(`Cannot reach API endpoint: ${endpoint}. ${error.message}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Writing review API failed at ${endpoint}: ${response.status} ${errorText.slice(0, 180)}`);
    }

    return response.json();
  },
};

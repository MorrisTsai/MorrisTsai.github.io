window.rewardSchoolApi = {
  async reviewWriting({ question, essay, sourceId }) {
    const config = window.rewardSchoolAiConfig || {};
    if (!config.writingReviewEndpoint) {
      throw new Error("Writing review API endpoint is missing.");
    }

    const response = await fetch(config.writingReviewEndpoint, {
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Writing review API failed: ${response.status} ${errorText.slice(0, 180)}`);
    }

    return response.json();
  },
};

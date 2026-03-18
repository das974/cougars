FROM node:24

# GH, jq and sduo
RUN apt-get update \
    && apt-get install -y --no-install-recommends gh jq sudo \
    && rm -rf /var/lib/apt/lists/* \
    && echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# NPM Gloabl tools, pnpm, yalc and airtable blocks CLI
RUN npm add --global pnpm@10 yalc@1.0.0-pre.53 @airtable/blocks-cli

ARG USERNAME=node

RUN \
    mkdir -p /home/${USERNAME}/.config /home/${USERNAME}/.config/pnpm /home/${USERNAME}/.pnpm-store \
    && printf "store-dir=/home/${USERNAME}/.pnpm-store\n" > /home/${USERNAME}/.config/pnpm/rc \
    && chown -R ${USERNAME}:${USERNAME} /home/${USERNAME}/.config /home/${USERNAME}/.pnpm-store

# Pre-create workspace dirs and npm cache with correct ownership
RUN mkdir -p /src/node_modules /src/.forge /home/${USERNAME}/.npm \
    && chown -R ${USERNAME}:${USERNAME} /src/node_modules /src/.forge /home/${USERNAME}/.npm

RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
    && mkdir /commandhistory \
    && touch /commandhistory/.bash_history \
    && chown -R $USERNAME /commandhistory \
    && echo "$SNIPPET" >> "/home/$USERNAME/.bashrc"

RUN grep -qxF "alias python=python3" "/home/$USERNAME/.bashrc" \
    || echo "alias python=python3" >> "/home/$USERNAME/.bashrc"

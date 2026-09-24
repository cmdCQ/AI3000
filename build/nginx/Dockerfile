FROM nginx:alpine
RUN apk add --no-cache curl
COPY . /usr/share/nginx/html/
COPY nginx-default.conf /etc/nginx/conf.d/default.conf
RUN rm -f /usr/share/nginx/html/nginx-default.conf /usr/share/nginx/html/Dockerfile
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

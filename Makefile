LIGHTTPD_VERSION = 1.4.77
OUTFILE = lighttpd
TMP_DIR = /tmp/lighttpd-$(LIGHTTPD_VERSION)
PLUGIN_STATIC_HEADER_FILE = $(TMP_DIR)/src/plugin-static.h

.PHONY: build build-scon clean

build:
	apk add \
		bsd-compat-headers \
		build-base \
		curl \
		tar \
		autoconf \
		automake \
		libtool \
		m4 \
		pcre2 \
		pcre2-dev \
		pkgconfig \
		libdeflate \
		libdeflate-dev

	curl -o /tmp/lighttpd.tar.gz https://download.lighttpd.net/lighttpd/releases-1.4.x/lighttpd-$(LIGHTTPD_VERSION).tar.gz
	tar -C /tmp -xf /tmp/lighttpd.tar.gz
	cd $(TMP_DIR) && sh autogen.sh
	touch $(PLUGIN_STATIC_HEADER_FILE)
	echo 'PLUGIN_INIT(mod_access)' >> $(PLUGIN_STATIC_HEADER_FILE)
	echo 'PLUGIN_INIT(mod_deflate)' >> $(PLUGIN_STATIC_HEADER_FILE)
	cd $(TMP_DIR); LIGHTTPD_STATIC=yes ./configure -C --enable-static=yes --with-libdeflate --with-pcre2
	cd $(TMP_DIR) && make
	cd $(TMP_DIR) && make install
	mv /usr/local/sbin/lighttpd /$(OUTFILE)

build-scon:
	apk add \
		bsd-compat-headers \
		build-base \
		pkgconf \
		curl \
		pcre2 \
		pcre2-dev \
		zlib-static \
		gcompat \
		scons

	apk del zlib # ensure static-linked variant is used

	curl -o /tmp/lighttpd.tar.gz https://download.lighttpd.net/lighttpd/releases-1.4.x/lighttpd-$(LIGHTTPD_VERSION).tar.gz
	tar -C /tmp -xf /tmp/lighttpd.tar.gz

	cd $(TMP_DIR); scons -j 4 build_fullstatic=1 build_dynamic=0 with_zlib=1 with_pcre2=1
	mv $(TMP_DIR)/sconsbuild/fullstatic/build/lighttpd /$(OUTFILE)

clean:
	rm /tmp/lighttpd.tar.gz
	rm -r /tmp/lighttpd-${LIGHTTPD_VERSION}
	rm /$(OUTFILE)